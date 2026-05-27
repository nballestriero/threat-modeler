const express = require('express');
const router = express.Router();
const axios = require('axios');
const fsSync = require('fs');
const path = require('path');

// POST /api/test/ollama
router.post('/test/ollama', async (req, res) => {
    const { host, port } = req.body;
    let baseUrl;
    if (host && port) {
        baseUrl = `${host}:${port}`;
    } else {
        // Fallback: leggi configurazione
        const { loadConfig } = require('../utils/configUtils');
        const config = await loadConfig();
        baseUrl = config.ollama.baseUrl;
    }
    try {
        const response = await axios.get(`${baseUrl}/api/version`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ connected: true, message: `✅ Connesso a Ollama v${response.data.version}` });
        }
    } catch (err) {
        console.error('Ollama test error:', err.message);
    }
    res.json({ connected: false, message: '❌ Ollama non raggiungibile.' });
});

// POST /api/test/db
router.post('/test/db', async (req, res) => {
    const { type, path: dbPath } = req.body;
    try {
        if (type === 'sqlite') {
            const fullPath = path.resolve(dbPath);
            const dir = path.dirname(fullPath);
            fsSync.accessSync(dir, fsSync.constants.W_OK);
            return res.json({ connected: true, message: `✅ Percorso DB accessibile: ${fullPath}` });
        }
        res.json({ connected: false, message: '❌ Tipo DB non supportato.' });
    } catch (err) {
        res.json({ connected: false, message: `❌ Errore accesso: ${err.message}` });
    }
});

module.exports = router;