// backend/routes/ollama.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * GET /api/ollama/models
 * Restituisce la lista dei modelli installati in Ollama
 */
router.get('/ollama/models', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 5000 });

        // Ollama restituisce { models: [{ name: 'llama3', ... }, ...] }
        const models = response.data.models?.map(m => m.name) || [];

        res.json(models);
    } catch (err) {
        console.error('❌ Errore fetch modelli Ollama:', err.message);

        // Se Ollama non risponde, restituisci array vuoto (gestito dal frontend)
        if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
            return res.status(503).json({
                error: 'Ollama non raggiungibile',
                hint: 'Verifica che Ollama sia in esecuzione su http://localhost:11434'
            });
        }

        res.status(500).json({ error: 'Errore durante il recupero dei modelli' });
    }
});

/**
 * POST /api/ollama/test
 * Test di connettività verso Ollama
 */
router.post('/ollama/test', async (req, res) => {
    const { host, port } = req.body;
    const baseUrl = `${host}:${port || '11434'}`;

    try {
        await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
        res.json({ connected: true, message: '✅ Ollama raggiungibile' });
    } catch (err) {
        res.json({
            connected: false,
            message: `❌ ${err.code === 'ECONNREFUSED' ? 'Ollama non in esecuzione' : err.message}`
        });
    }
});

/**
 * POST /api/ollama/chat (opzionale, per future estensioni)
 * Proxy per chiamate chat completation
 */
router.post('/ollama/chat', async (req, res) => {
    try {
        const response = await axios.post(`${OLLAMA_BASE}/api/chat`, req.body, {
            timeout: 120000, // 2 minuti per risposte lunghe
            responseType: 'stream' // Supporta streaming se necessario
        });

        // Proxy della risposta stream
        response.data.pipe(res);
    } catch (err) {
        console.error('❌ Errore chat Ollama:', err.message);
        res.status(500).json({ error: 'Errore durante la generazione della risposta' });
    }
});

module.exports = router;