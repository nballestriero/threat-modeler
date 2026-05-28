// backend/routes/analysisDfd.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const fsSync = require('fs');
const router = express.Router();

const { loadConfig } = require('../utils/configUtils');
const { loadModel, saveModel } = require('../models/assetModel');
const { extractText } = require('../utils/fileUtils');
const { v4: uuidv4 } = require('uuid');

const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');
let TAXONOMY_CACHE = null;

// ============================================================================
// 🔍 HELPER: Logging leggero (attivabile con DEBUG_RAG=1)
// ============================================================================
function log(label, data = {}) {
    if (process.env.DEBUG_RAG) {
        console.log(`🔍 [${label}]`, data);
    }
}

// ============================================================================
// 🤖 HELPER: Chiamata a Ollama con retry e timeout
// ============================================================================
async function callOllama(prompt, config, options = {}) {
    const { baseUrl, model, timeout = 60000 } = config.ollama || {};

    const payload = {
        model: model || 'llama3.1:8b',
        messages: [
            { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
            temperature: options.temperature || 0.1, // Bassa per output strutturato
            num_predict: options.numPredict || 2048
        }
    };

    try {
        const response = await axios.post(`${baseUrl}/api/chat`, payload, {
            timeout,
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.message?.content || '';
    } catch (err) {
        console.error('❌ Errore chiamata Ollama:', err.message);
        throw new Error(`LLM non disponibile: ${err.message}`);
    }
}

// ============================================================================
// 🧠 HELPER: Prompt per estrazione asset DFD
// ============================================================================
function buildExtractionPrompt(text, taxonomy, context = '') {
    const categories = taxonomy?.categories?.map(c => c.name).join(', ') || 'External Entity, Process, Data Store';

    return `
Sei un esperto di threat modeling e Data Flow Diagrams (DFD).
Analizza il seguente documento tecnico ed estrai gli asset rilevanti per un DFD.

CATEGORIE VALIDE (usa SOLO queste):
${categories}

ISTRUZIONI:
1. Identifica entità, processi e data store menzionati nel testo
2. Per ogni asset, fornisci: name (breve, 1-3 parole), category (una delle sopra), description (1 frase)
3. Evita duplicati: se "database utenti" e "user database" si riferiscono alla stessa cosa, mantieni solo uno
4. Ignora termini generici come "system", "application", "component" senza contesto specifico
5. Restituisci SOLO JSON valido, senza testo aggiuntivo

FORMATO OUTPUT (JSON array):
[
  { "name": "User Browser", "category": "External Entity", "description": "Interfaccia client per gli utenti finali" },
  { "name": "Auth API", "category": "Process", "description": "Servizio di autenticazione e gestione token" },
  { "name": "User Database", "category": "Data Store", "description": "Archivio persistente dei dati utente" }
]

CONTESTO AGGIUNTIVO (se fornito, usalo per arricchire l'analisi):
${context ? `---\n${context.substring(0, 2000)}\n---` : ''}

DOCUMENTO DA ANALIZZARE:
---
${text.substring(0, 8000)}
---

OUTPUT JSON:
`.trim();
}

// ============================================================================
// 🔧 HELPER: Parsing JSON robusto con fallback
// ============================================================================
function parseLlmResponse(response) {
    try {
        // Cerca il primo blocco JSON valido nella risposta
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Nessun array JSON trovato');

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error('Il risultato non è un array');

        // Validazione e pulizia degli asset
        return parsed
            .filter(a => a?.name && a?.category && a.name.length >= 2)
            .map(a => ({
                name: a.name.trim().replace(/\s+/g, ' '),
                category: a.category.trim(),
                description: (a.description || 'Estratto automaticamente').trim(),
                source: 'llm-extraction'
            }));
    } catch (err) {
        console.warn('⚠️ Parsing JSON fallito:', err.message);
        console.warn('📄 Risposta LLM (primi 500 char):', response.substring(0, 500));
        return [];
    }
}

// ============================================================================
// 🤖 FUNZIONE PRINCIPALE: Estrazione asset con LLM + fallback regex
// ============================================================================
async function extractAssetsWithLLM(text, taxonomy, config, context = '') {
    // 1. Prova con LLM
    try {
        console.log('🤖 [LLM] Invio prompt per estrazione asset...');
        const prompt = buildExtractionPrompt(text, taxonomy, context);
        const response = await callOllama(prompt, config, {
            systemPrompt: 'You are a security analyst specialized in DFD asset extraction. Output ONLY valid JSON.',
            temperature: 0.1,
            numPredict: 3000
        });

        const assets = parseLlmResponse(response);
        console.log(`🤖 [LLM] ✅ Estratti ${assets.length} asset via LLM`);

        if (assets.length > 0) return assets;
        console.warn('⚠️ [LLM] Nessun asset valido estratto, provo fallback regex...');

    } catch (err) {
        console.warn('⚠️ [LLM] Estrazione fallita:', err.message);
        console.warn('🔄 Attivo fallback regex...');
    }

    // 2. Fallback: regex semplici (se LLM fallisce)
    return extractAssetsWithRegex(text, taxonomy);
}

// ============================================================================
// 🔁 FALLBACK: Estrazione con regex (se LLM non disponibile)
// ============================================================================
function extractAssetsWithRegex(text, taxonomy) {
    if (!text || text.length < 100) return [];

    const assets = [];
    const seen = new Set();
    const normalized = text.toLowerCase();

    const patterns = [
        { regex: /\b(user|client|browser|mobile app|api consumer|external system|gateway|load balancer|firewall|admin)\b/gi, cat: 'External Entity' },
        { regex: /\b(auth service|payment service|api handler|controller|validator|scheduler|worker|engine|notification service)\b/gi, cat: 'Process' },
        { regex: /\b(user database|session store|message queue|object storage|cache layer|log aggregator|config registry)\b/gi, cat: 'Data Store' }
    ];

    for (const { regex, cat } of patterns) {
        const matches = normalized.match(regex);
        if (!matches) continue;

        for (const m of matches) {
            const clean = m.trim().replace(/\s+/g, ' ');
            if (!seen.has(clean)) {
                seen.add(clean);
                assets.push({
                    name: clean.charAt(0).toUpperCase() + clean.slice(1),
                    category: cat,
                    description: 'Identificato con pattern di fallback',
                    source: 'regex-fallback'
                });
            }
        }
    }

    console.log(`🔁 [REGEX] Estratti ${assets.length} asset con fallback`);
    return assets;
}

// ============================================================================
// 💾 HELPER: Salvataggio asset con deduplicazione robusta
// ============================================================================
async function persistAssets(newAssets) {
    if (!newAssets?.length) return { saved: 0, duplicates: 0 };

    try {
        const model = await loadModel();
        const existing = new Set((model.assets || []).map(a => (a.name || '').trim().toLowerCase()));

        const toSave = [];
        let duplicates = 0;

        for (const asset of newAssets) {
            const key = (asset.name || '').trim().toLowerCase();
            if (key.length < 3 || key === 'asset' || existing.has(key)) {
                duplicates++;
                continue;
            }
            existing.add(key);
            toSave.push({
                id: asset.id || uuidv4(),
                createdAt: asset.createdAt || new Date().toISOString(),
                source: asset.source || 'llm-extraction',
                name: asset.name,
                category: asset.category,
                description: asset.description || ''
            });
        }

        if (toSave.length > 0) {
            model.assets = [...(model.assets || []), ...toSave];
            await saveModel(model);
            console.log(`💾 [ASSET] ✅ Salvati: ${toSave.length} | 🗑️ Duplicati: ${duplicates}`);
        }

        return { saved: toSave.length, duplicates };
    } catch (err) {
        console.error('❌ Errore salvataggio asset:', err.message);
        return { saved: 0, duplicates: 0, error: err.message };
    }
}

// ============================================================================
// ENDPOINT: POST /api/analyze/extract-assets-dfd
// ============================================================================
router.post('/extract-assets-dfd', async (req, res) => {
    console.log('📥 [ENDPOINT] Ricevuta richiesta DFD extraction');
    console.log('📊 [MEM] Start:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

    const { docFiles, contextFiles, projectId = 'default' } = req.body;
    const config = await loadConfig();

    if (!config.ollama?.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato in configurazione.' });
    }

    try {
        // === RAG Context (solo per HTTP mode) ===
        let ragContext = '';
        if (config.rag?.enabled && config.rag.mode === 'http-server') {
            try {
                const query = (docFiles || []).map(f => path.basename(f)).join(' ') + ' DFD assets threat modeling';
                const baseUrl = config.rag.baseUrl?.replace(/\/$/, '');
                const collection = `${config.rag.collectionPrefix || 'threatmodel_'}${projectId}`;

                const resp = await axios.post(`${baseUrl}/api/v1/collections/${collection}/query`, {
                    query_texts: [query], n_results: 3, include: ['documents']
                }, { timeout: 10000 });

                const docs = resp.data.documents?.[0] || [];
                ragContext = docs.length > 0 ? `\n=== RAG CONTEXT ===\n${docs.join('\n')}\n=== END ===\n` : '';
                console.log(`🧠 [RAG] Contesto aggiunto: ${docs.length} documenti`);
            } catch (err) {
                console.warn('⚠️ [RAG] Query fallita (continuo senza):', err.message);
            }
        }

        console.log('📊 [MEM] Post-RAG:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

        // === Carica documenti ===
        let mainText = '';
        for (const fPath of docFiles || []) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                mainText += `\n--- ${path.basename(fPath)} ---\n${text}\n`;
            }
        }

        // Aggiungi contesto aggiuntivo
        for (const fPath of contextFiles || []) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                mainText += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${text.substring(0, 3000)}\n`;
            }
        }

        if (!mainText.trim()) {
            return res.status(400).json({ error: 'Nessun testo estratto dai documenti.' });
        }

        console.log(`📄 [TESTO] Caricati ${mainText.length} caratteri`);
        console.log('📊 [MEM] Post-docs:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

        // === Taxonomy ===
        let taxonomy = TAXONOMY_CACHE;
        if (!taxonomy) {
            taxonomy = JSON.parse(fsSync.readFileSync(TAXONOMY_PATH, 'utf-8'));
            TAXONOMY_CACHE = taxonomy;
        }

        // === Estrazione asset con LLM ===
        console.log('🤖 [LLM] Inizio estrazione asset...');
        const assets = await extractAssetsWithLLM(mainText, taxonomy, config, ragContext);

        // Cleanup memoria
        mainText = null;
        if (global.gc) global.gc();
        console.log('📊 [MEM] Post-extraction + GC:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

        // === Salvataggio ===
        const { saved, duplicates } = await persistAssets(assets);

        // === Response ===
        res.json({
            success: true,
            assets,
            count: assets.length,
            saved,
            duplicates,
            message: `✅ Estratti ${assets.length} asset (${saved} nuovi, ${duplicates} duplicati)`
        });

        console.log(`✅ [ENDPOINT] Completato: ${assets.length} asset, ${saved} salvati`);

    } catch (err) {
        console.error('❌ [ERROR] Errore in extract-assets-dfd:', err);
        if (global.gc) global.gc();
        res.status(500).json({
            error: 'Errore interno durante l\'analisi',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;