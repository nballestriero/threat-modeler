const express = require('express');
const router = express.Router();
const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

router.get('/assets', async (req, res) => {
    const model = await loadModel();
    res.json(model.assets);
});

router.post('/assets', async (req, res) => {
    const model = await loadModel();
    const newAsset = { id: uuidv4(), ...req.body };
    model.assets.push(newAsset);
    await saveModel(model);
    res.status(201).json(newAsset);
});

router.put('/assets/:id', async (req, res) => {
    const model = await loadModel();
    const idx = model.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
    model.assets[idx] = { ...model.assets[idx], ...req.body, id: req.params.id };
    await saveModel(model);
    res.json(model.assets[idx]);
});

router.delete('/assets/:id', async (req, res) => {
    const model = await loadModel();
    const idx = model.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
    model.assets.splice(idx, 1);
    await saveModel(model);
    res.json({ message: 'Asset eliminato con successo' });
});

router.post('/assets/import', async (req, res) => {
    const { assets } = req.body;
    if (!Array.isArray(assets)) return res.status(400).json({ error: 'Formato non valido' });
    const model = await loadModel();
    const newAssets = assets.map(a => ({ id: uuidv4(), ...a }));
    model.assets = [...model.assets, ...newAssets];
    await saveModel(model);
    res.json({ success: true, imported: newAssets.length });
});

module.exports = router;