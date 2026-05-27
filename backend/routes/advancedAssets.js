const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ADVANCED_FILE = path.join(__dirname, '../advanced-assets.json');

async function loadAdvanced() {
    try {
        const data = await fs.readFile(ADVANCED_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveAdvanced(assets) {
    await fs.writeFile(ADVANCED_FILE, JSON.stringify(assets, null, 2));
}

router.get('/advanced-assets', async (req, res) => {
    const assets = await loadAdvanced();
    res.json(assets);
});

router.post('/advanced-assets', async (req, res) => {
    const assets = await loadAdvanced();
    const newAsset = { id: uuidv4(), ...req.body };
    assets.push(newAsset);
    await saveAdvanced(assets);
    res.status(201).json(newAsset);
});

router.put('/advanced-assets/:id', async (req, res) => {
    const assets = await loadAdvanced();
    const idx = assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
    assets[idx] = { ...assets[idx], ...req.body, id: req.params.id };
    await saveAdvanced(assets);
    res.json(assets[idx]);
});

router.delete('/advanced-assets/:id', async (req, res) => {
    const assets = await loadAdvanced();
    await saveAdvanced(assets.filter(a => a.id !== req.params.id));
    res.json({ success: true });
});

module.exports = { router, loadAdvanced, saveAdvanced };