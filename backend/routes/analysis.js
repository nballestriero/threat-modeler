// backend/routes/analysis.js
const { spawn } = require('child_process');
const fsPromises = require('fs').promises;
const express = require('express');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { loadConfig } = require('../utils/configUtils');
const { loadModel, saveModel } = require('../models/assetModel'); // Presuppone che il file esista
const { runAnalysisPipeline } = require('../services/analysisOrchestrator');
const { AnalysisContext } = require('../services/analysisContext');
const { extractText } = require('../utils/fileUtils');

const execFileAsync = promisify(execFile);
const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');
let TAXONOMY_CACHE = null;

// ============================================================================
// HELPER: Query RAG (supporta dual-mode)
// ============================================================================
async function queryRag(queryText, config, options = {}) {
    const rag = config?.rag;
    if (!rag?.enabled) return { context: '', warning: 'RAG disabilitato' };

    const mode = rag.mode || 'http-server';
    const collection = `${rag.collectionPrefix || 'threatmodel_'}${options.projectId || 'default'}`;
    const nResults = options.nResults || 5;
    const backendRoot = path.resolve(__dirname, '..');

    try {
        let results = [];

        if (mode === 'http-server') {
            const baseUrl = rag.baseUrl?.replace(/\/$/, '');
            const resp = await axios.post(`${baseUrl}/api/v1/collections/${collection}/query`, {
                query_texts: [queryText], n_results: nResults, include: ['documents', 'metadatas']
            }, { timeout: 15000 });
            results = resp.data.documents?.[0] || [];

        } else if (mode === 'python-client') {
            const bridge = rag.pythonBridge;
            const pythonPath = path.isAbsolute(bridge.pythonCmd) ? bridge.pythonCmd : path.resolve(backendRoot, bridge.pythonCmd.replace(/^\.\//, ''));
            const scriptPath = path.isAbsolute(bridge.scriptPath) ? bridge.scriptPath : path.resolve(backendRoot, bridge.scriptPath.replace(/^\.\//, ''));
            const persistDir = rag.persistDirectory ? (path.isAbsolute(rag.persistDirectory) ? rag.persistDirectory : path.resolve(backendRoot, rag.persistDirectory.replace(/^\.\//, ''))) : path.resolve(backendRoot, 'chroma_data');

            // ✅ Payload salvato in file temporaneo (evita limiti/escaping di Windows CLI)
            const payloadFile = path.join(backendRoot, '.rag_payload.tmp');
            await fsPromises.writeFile(payloadFile, JSON.stringify({ query: queryText, collection, n_results: nResults }), 'utf-8');

            results = await new Promise((resolve) => {
                const proc = spawn(pythonPath, [scriptPath, '--query', '--persist-dir', persistDir, '--payload-file', payloadFile], {
                    cwd: backendRoot,
                    env: { ...process.env, TQDM_DISABLE: '1', PYTHONUNBUFFERED: '1' },
                    timeout: 300000 // ✅ 5 minuti per la prima esecuzione
                });

                let out = '', err = '';
                proc.stdout.on('data', d => out += d.toString());
                proc.stderr.on('data', d => err += d.toString());

                proc.on('close', code => {
                    fsPromises.unlink(payloadFile).catch(() => { }); // cleanup
                    try {
                        const jsonLine = out.trim().split('\n').reverse().find(l => l.trim().startsWith('{'));
                        const parsed = jsonLine ? JSON.parse(jsonLine) : {};
                        if (parsed.status === 'ok') resolve(parsed.documents || []);
                        else { console.warn('⚠️ RAG:', parsed.error || err); resolve([]); }
                    } catch (e) {
                        console.error('❌ RAG parse error:', e.message, err);
                        resolve([]);
                    }
                });

                proc.on('error', e => {
                    fsPromises.unlink(payloadFile).catch(() => { });
                    console.error('❌ RAG spawn error:', e.message);
                    resolve([]);
                });
            });
        }

        if (results.length > 0) {
            return { context: `\n\n=== CONTESTO RAG ===\n${results.join('\n')}\n=== FINE CONTESTO ===\n`, warning: null };
        }
        return { context: '', warning: 'RAG attivo ma nessun documento trovato' };

    } catch (err) {
        console.error('❌ Query RAG fallita:', err.message);
        return { context: '', warning: `RAG non disponibile: ${err.message}. Continuo senza contesto.` };
    }
}
// ============================================================================
// HELPER: Salva asset nel modello persistente (FIX BUG #2)
// ============================================================================
async function persistAssets(newAssets) {
    if (!newAssets || newAssets.length === 0) return 0;
    try {
        const model = await loadModel();
        const existingNames = new Set((model.assets || []).map(a => a.name?.toLowerCase()));

        const assetsToSave = newAssets
            .filter(a => a.name && a.name.length > 2 && a.name !== 'Asset')
            .filter(a => !existingNames.has(a.name.toLowerCase()))
            .map(a => ({
                id: a.id || uuidv4(),
                createdAt: a.createdAt || new Date().toISOString(),
                source: a.source || 'ai-extraction',
                ...a
            }));

        if (assetsToSave.length > 0) {
            model.assets = [...(model.assets || []), ...assetsToSave];
            await saveModel(model);
            console.log(`💾 Salvati ${assetsToSave.length} nuovi asset in threat-model.json`);
        }
        return assetsToSave.length;
    } catch (err) {
        console.error('❌ Errore salvataggio asset:', err.message);
        return -1;
    }
}

// ============================================================================
// ENDPOINT: Estrazione Asset
// ============================================================================
router.post('/analyze/extract-assets', async (req, res) => {
    const { docFiles, contextFiles, autoSave = true, projectId } = req.body;
    const config = await loadConfig();

    if (!config.ollama?.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato in configurazione.' });
    }

    try {
        // 1. Arricchimento contesto RAG
        let ragContext = '';
        let ragWarning = null;
        if (config.rag?.enabled && docFiles?.length) {
            const query = docFiles.map(f => path.basename(f)).join(' ') + ' threat modeling assets';
            const ragRes = await queryRag(query, config, { projectId, nResults: 3 });
            ragContext = ragRes.context;
            ragWarning = ragRes.warning;
            if (ragContext) console.log(`🔍 RAG: aggiunti contesto da ${ragRes.context.length} chars`);
        }

        // 2. Caricamento file di contesto aggiuntivi
        let fixedContextRich = ragContext;
        if (contextFiles?.length) {
            for (const fPath of contextFiles) {
                if (fsSync.existsSync(fPath)) {
                    const text = await extractText(fPath, path.extname(fPath));
                    fixedContextRich += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${text.substring(0, 3000)}\n`;
                }
            }
        }

        // 3. Caricamento documenti principali
        let mainDocText = '';
        for (const fPath of docFiles || []) {
            if (fsSync.existsSync(fPath)) {
                mainDocText += `\n--- DOC: ${path.basename(fPath)} ---\n${await extractText(fPath, path.extname(fPath))}\n`;
            }
        }
        if (!mainDocText.trim()) return res.status(400).json({ error: 'Nessun testo estratto dai documenti.' });

        // 4. Chunking
        const chunks = [];
        let i = 0;
        while (i < mainDocText.length) {
            let chunk = mainDocText.substring(i, i + 2000);
            if (i + 2000 < mainDocText.length) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > 1400) chunk = chunk.substring(0, lastSpace);
            }
            chunks.push(chunk);
            i += chunk.length - 300;
        }

        // 5. Taxonomy (con cache)
        let taxonomy = TAXONOMY_CACHE;
        if (!taxonomy) {
            taxonomy = JSON.parse(fsSync.readFileSync(TAXONOMY_PATH, 'utf-8'));
            TAXONOMY_CACHE = taxonomy;
        }

        // 6. Esecuzione pipeline
        const ctx = new AnalysisContext({ config, taxonomy, docFiles, contextFiles, fixedContextRich, chunks });
        const finalCtx = await runAnalysisPipeline(ctx);

        // 7. ✅ FIX BUG #2: Salvataggio asset
        let savedCount = 0;
        if (autoSave !== false && finalCtx.finalAssets?.length > 0) {
            savedCount = await persistAssets(finalCtx.finalAssets);
        }

        res.json({
            success: true,
            assets: finalCtx.finalAssets || [],
            count: finalCtx.finalAssets?.length || 0,
            saved: savedCount,
            saveError: savedCount === -1 ? 'Errore durante il salvataggio' : null,
            ragUsed: !!ragContext,
            ragWarning
        });

    } catch (err) {
        console.error('❌ Errore in /analyze/extract-assets:', err);
        res.status(500).json({
            error: 'Errore interno durante l\'analisi',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;