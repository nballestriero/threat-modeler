// backend/routes/rag.js
const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');
const fsPromises = require('fs').promises;
const path = require('path');
const router = express.Router();
const { loadConfig } = require('../utils/configUtils');

// ============================================================================
// HELPER: Esegue il bridge Python (Windows-compatible)
// ============================================================================
async function runPythonBridge(args, config, timeout = 30000) {
    const rag = config.rag;
    const bridge = rag.pythonBridge || {};
    const backendRoot = path.resolve(__dirname, '..');

    const pythonPath = path.isAbsolute(bridge.pythonCmd || 'python3')
        ? bridge.pythonCmd
        : path.resolve(backendRoot, (bridge.pythonCmd || 'python3').replace(/^\.\//, ''));

    const scriptPath = path.isAbsolute(bridge.scriptPath)
        ? bridge.scriptPath
        : path.resolve(backendRoot, bridge.scriptPath.replace(/^\.\//, ''));

    const persistDir = rag.persistDirectory
        ? (path.isAbsolute(rag.persistDirectory) ? rag.persistDirectory : path.resolve(backendRoot, rag.persistDirectory.replace(/^\.\//, '')))
        : path.resolve(backendRoot, 'chroma_data');

    return new Promise((resolve, reject) => {
        const proc = spawn(pythonPath, [...args, '--persist-dir', persistDir], {
            cwd: backendRoot,
            env: { ...process.env, TQDM_DISABLE: '1', PYTHONUNBUFFERED: '1' },
            timeout: timeout,
            maxBuffer: 10 * 1024 * 1024
        });

        let out = '', err = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.stderr.on('data', d => err += d.toString());

        proc.on('close', async (code) => {
            try {
                const lines = out.trim().split('\n').filter(l => l.trim());
                const lastJson = lines.reverse().find(l => l.trim().startsWith('{'));
                const parsed = lastJson ? JSON.parse(lastJson) : {};
                resolve({ status: parsed.status, data: parsed, error: err?.trim() });
            } catch (e) {
                resolve({ status: 'error', data: { error: `Parse error: ${e.message}` }, error: err?.trim() });
            }
        });
        proc.on('error', reject);
    });
}

// ============================================================================
// ENDPOINT 1: Test connessione - POST /api/rag/test-connection
// ============================================================================
router.post('/rag/test-connection', async (req, res) => {
    try {
        const config = await loadConfig();
        const rag = config?.rag;
        if (!rag?.enabled) return res.json({ connected: false, message: 'RAG disabilitato', mode: null });

        const mode = rag.mode || 'http-server';

        if (mode === 'http-server') {
            const baseUrl = (rag.baseUrl || '').replace(/\/$/, '');
            if (!baseUrl) return res.json({ connected: false, message: 'baseUrl mancante', mode: 'http-server' });
            try {
                await axios.get(`${baseUrl}/api/v1/heartbeat`, { timeout: 4000 });
                return res.json({ connected: true, message: '✅ Connesso (HTTP)', mode: 'http-server' });
            } catch (err) {
                return res.json({ connected: false, message: `❌ HTTP: ${err.message}`, mode: 'http-server' });
            }
        }

        if (mode === 'python-client') {
            try {
                const result = await runPythonBridge(['./services/rag_bridge.py', '--health'], config, 10000);
                if (result.data?.status === 'ok') {
                    return res.json({ connected: true, message: `✅ Python Client (${result.data.collections || 0} collezioni)`, mode: 'python-client', details: result.data });
                }
                return res.json({ connected: false, message: result.data?.error || 'Errore bridge', mode: 'python-client' });
            } catch (err) {
                return res.json({ connected: false, message: `❌ Bridge: ${err.message}`, mode: 'python-client' });
            }
        }

        return res.json({ connected: false, message: `Modalità non supportata: ${mode}` });
    } catch (err) {
        res.status(500).json({ connected: false, message: err.message });
    }
});

// ============================================================================
// ENDPOINT 2: Indicizzazione - POST /api/rag/index  ← NUOVO: FIX "Invalid URL"
// ============================================================================
router.post('/rag/index', async (req, res) => {
    try {
        const config = await loadConfig();
        const rag = config?.rag;
        const { documents, projectId = 'default' } = req.body;

        if (!rag?.enabled) return res.status(400).json({ error: 'RAG disabilitato' });
        if (!documents?.length) return res.json({ success: true, indexed: 0, message: 'Nessun documento da indicizzare' });

        const mode = rag.mode || 'http-server';
        const collection = `${rag.collectionPrefix || 'threatmodel_'}${projectId}`;

        // ------------------------------------------------------------------------
        // MODALITÀ: python-client → Nessun pre-indexing necessario (query on-demand)
        // ------------------------------------------------------------------------
        if (mode === 'python-client') {
            console.log(`🧠 RAG (python-client): skip pre-indexing, query on-demand per collection "${collection}"`);
            return res.json({
                success: true,
                indexed: 0,
                mode: 'python-client',
                message: 'Modalità Python Client: i documenti verranno indicizzati automaticamente durante le query'
            });
        }

        // ------------------------------------------------------------------------
        // MODALITÀ: http-server → Invia documenti a ChromaDB via HTTP
        // ------------------------------------------------------------------------
        if (mode === 'http-server') {
            const baseUrl = (rag.baseUrl || '').replace(/\/$/, '');
            if (!baseUrl) return res.status(400).json({ error: 'baseUrl mancante per modalità HTTP' });

            // Prepara payload per ChromaDB API
            const payload = {
                ids: documents.map((d, i) => d.id || `doc_${Date.now()}_${i}`),
                documents: documents.map(d => d.text || d.content || ''),
                metadatas: documents.map(d => d.metadata || { source: d.source || 'unknown' })
            };

            await axios.post(`${baseUrl}/api/v1/collections/${collection}/add`, payload, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log(`🧠 RAG (http-server): ${payload.ids.length} documenti indicizzati in "${collection}"`);
            return res.json({ success: true, indexed: payload.ids.length, mode: 'http-server' });
        }

        return res.status(400).json({ error: `Modalità RAG non supportata: ${mode}` });

    } catch (err) {
        console.error('❌ Errore indicizzazione RAG:', err.message);
        return res.status(500).json({
            error: `Indicizzazione fallita: ${err.message}`,
            hint: err.message.includes('Invalid URL') ? 'Verifica che rag.mode e rag.baseUrl siano configurati correttamente' : undefined
        });
    }
});

module.exports = router;