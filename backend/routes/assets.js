const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { loadAdvanced, saveAdvanced } = require('./advancedAssets');

const JSON_FILE = path.join(__dirname, '../threat-model.json');

async function loadModel() {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { assets: [], flows: [] };
    }
}

async function saveModel(model) {
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
}

// Asset base
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
    model.assets = model.assets.filter(a => a.id !== req.params.id);
    await saveModel(model);
    res.json({ message: 'Asset eliminato' });
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

// Flussi
router.get('/flows', async (req, res) => {
    const model = await loadModel();
    res.json(model.flows || []);
});

router.post('/flows', async (req, res) => {
    const model = await loadModel();
    const newFlow = { id: uuidv4(), ...req.body };
    if (!model.flows) model.flows = [];
    model.flows.push(newFlow);
    await saveModel(model);
    res.status(201).json(newFlow);
});

router.put('/flows/:id', async (req, res) => {
    const model = await loadModel();
    if (!model.flows) model.flows = [];
    const idx = model.flows.findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Flusso non trovato' });
    model.flows[idx] = { ...model.flows[idx], ...req.body, id: req.params.id };
    await saveModel(model);
    res.json(model.flows[idx]);
});

router.delete('/flows/:id', async (req, res) => {
    const model = await loadModel();
    if (model.flows) model.flows = model.flows.filter(f => f.id !== req.params.id);
    await saveModel(model);
    res.json({ success: true });
});

// DELETE /assets/:id - modifica per eliminare anche gli asset avanzati
router.delete('/assets/:id', async (req, res) => {
    const model = await loadModel();
    model.assets = model.assets.filter(a => a.id !== req.params.id);
    await saveModel(model);

    // Elimina anche gli asset avanzati che si riferiscono a questo asset base
    const advanced = await loadAdvanced();
    const filteredAdvanced = advanced.filter(a => a.originalAssetId !== req.params.id);
    await saveAdvanced(filteredAdvanced);

    res.json({ message: 'Asset eliminato' });
});

module.exports = router;