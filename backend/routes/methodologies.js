const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../utils/configUtils');
const { loadModel } = require('../models/assetModel');

// Carica dinamicamente tutte le metodologie dalla cartella methodologies/
const methodologies = {};
const methodsDir = path.join(__dirname, '../methodologies');
fs.readdirSync(methodsDir).forEach(method => {
    const methodPath = path.join(methodsDir, method);
    if (fs.statSync(methodPath).isDirectory()) {
        const index = require(path.join(methodPath, 'index.js'));
        methodologies[index.METHOD_NAME] = index;
    }
});

router.get('/methodologies', (req, res) => {
    res.json(Object.keys(methodologies));
});

router.post('/methodologies/:name/enrich', async (req, res) => {
    const { name } = req.params;
    const { assetIds } = req.body;
    const method = methodologies[name];
    if (!method) return res.status(404).json({ error: 'Method not found' });
    const config = await loadConfig();
    const result = await method.batchEnhance(assetIds, config);
    res.json(result);
});

module.exports = router;