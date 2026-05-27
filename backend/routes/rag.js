const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/test-connection', async (req, res) => {
    const { baseUrl } = req.body;
    if (!baseUrl) {
        return res.status(400).json({ connected: false, message: 'URL mancante' });
    }
    try {
        const response = await axios.get(`${baseUrl}/api/v2/heartbeat`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ connected: true, message: '✅ Connesso a ChromaDB (v2)' });
        }
    } catch (err) {
        try {
            const response = await axios.get(`${baseUrl}/api/v1/heartbeat`, { timeout: 5000 });
            if (response.status === 200) {
                return res.json({ connected: true, message: '✅ Connesso a ChromaDB (v1 legacy)' });
            }
        } catch (e) {
            return res.json({ connected: false, message: `❌ ${e.message}` });
        }
    }
    res.json({ connected: false, message: 'Risposta inaspettata' });
});

module.exports = router;