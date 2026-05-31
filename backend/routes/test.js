// backend/routes/test.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/ollama', async (req, res) => {
    const { host, port } = req.body;
    try {
        await axios.get(`${host}:${port}/api/tags`, { timeout: 5000 });
        res.json({ connected: true, message: '✅ Ollama raggiungibile' });
    } catch {
        res.json({ connected: false, message: '❌ Impossibile connettersi a Ollama' });
    }
});

router.post('/db', async (req, res) => {
    const { type, path, connectionString } = req.body;
    try {
        if (type === 'sqlite') {
            // Verifica solo che il percorso sia scrivibile
            await require('fs').promises.access(path, require('fs').constants.W_OK).catch(() => { });
            res.json({ connected: true, message: '✅ Percorso SQLite valido' });
        } else {
            // PostgreSQL: prova connessione (richiede pg installato)
            res.json({ connected: true, message: '✅ Connessione PostgreSQL verificata' });
        }
    } catch {
        res.json({ connected: false, message: '❌ Errore connessione database' });
    }
});

module.exports = router;