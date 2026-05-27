const express = require('express');
const router = express.Router();
const axios = require('axios');
const { loadConfig, saveConfig } = require('../utils/configUtils');

router.get('/config', async (req, res) => {
    const config = await loadConfig();
    res.json(config);
});

router.put('/config', async (req, res) => {
    try {
        const currentConfig = await loadConfig();
        const newConfig = { ...currentConfig, ...req.body };
        if (!newConfig.ollama || !newConfig.ollama.model) {
            return res.status(400).json({ error: 'Modello obbligatorio' });
        }
        await saveConfig(newConfig);
        res.json(newConfig);
    } catch (err) {
        console.error('Errore salvataggio config:', err);
        res.status(500).json({ error: 'Impossibile salvare la configurazione' });
    }
});

router.get('/ollama/models', async (req, res) => {
    try {
        const config = await loadConfig();
        const response = await axios.get(`${config.ollama.baseUrl}/api/tags`);
        const modelNames = response.data.models.map(m => m.name);
        res.json(modelNames);
    } catch (err) {
        console.error('Errore connessione a Ollama:', err.message);
        res.status(503).json({ error: 'Impossibile connettersi a Ollama.' });
    }
});

module.exports = router;