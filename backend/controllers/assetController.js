/**
 * @file Controller per le operazioni sugli asset
 * @module controllers/assetController
 */

const assetService = require('../services/assetService');

/**
 * GET /api/assets
 */
async function getAllAssets(req, res) {
    const assets = await assetService.getAllAssets();
    res.json(assets);
}

/**
 * POST /api/assets
 */
async function createAsset(req, res) {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json(asset);
}

/**
 * POST /api/assets/import
 */
async function importAssets(req, res) {
    const { assets } = req.body;
    if (!Array.isArray(assets)) {
        return res.status(400).json({ error: 'Formato non valido, serve array assets' });
    }
    const result = await assetService.importAssets(assets);
    res.json(result);
}

/**
 * PUT /api/assets/:id
 */
async function updateAsset(req, res) {
    try {
        const updated = await assetService.updateAsset(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
}
/**
 * DELETE /api/assets/:id
 */
async function deleteAsset(req, res) {
    try {
        const result = await assetService.deleteAsset(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
}

module.exports = { getAllAssets, createAsset, importAssets, updateAsset, deleteAsset };