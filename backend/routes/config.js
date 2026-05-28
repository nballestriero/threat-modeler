// backend/routes/config.js
const express = require('express');
const router = express.Router();
const { loadConfig, saveConfig, deepMerge, DEFAULT_CONFIG } = require('../utils/configUtils');

// GET: /api/config
router.get('/config', async (req, res) => {
    try {
        const config = await loadConfig();
        res.json(config);
    } catch (err) {
        console.error('❌ GET /api/config error:', err.message);
        res.status(500).json({ error: 'Errore caricamento configurazione' });
    }
});

// PUT: /api/config (aggiornamento parziale con merge)
router.put('/config', async (req, res) => {
    try {
        const current = await loadConfig({ force: true });
        const updates = req.body;

        // Merge: DEFAULT_CONFIG → current → updates (garantisce struttura completa)
        const merged = deepMerge(deepMerge(DEFAULT_CONFIG, current), updates);

        // Salva con validazione
        await saveConfig(merged);

        console.log('✅ Config salvata:', Object.keys(updates).join(', '));
        res.json({ success: true, message: 'Configurazione aggiornata' });

    } catch (err) {
        console.error('❌ PUT /api/config error:', err.message);
        res.status(400).json({
            error: err.message,
            hint: 'Verifica i campi obbligatori nella richiesta'
        });
    }
});

module.exports = router;