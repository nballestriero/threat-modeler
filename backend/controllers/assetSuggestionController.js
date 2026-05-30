// backend/controllers/assetSuggestionController.js
/**
 * Controller per l'endpoint di suggerimento asset
 * @module controllers/assetSuggestionController
 */

const { suggestAssetImprovements } = require('../services/assetSuggestionService');

/**
 * POST /api/assets/:id/suggest
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 */
async function suggestAsset(req, res) {
    const { id } = req.params;
    try {
        const config = req.app.locals.config;
        const suggestion = await suggestAssetImprovements(id, config);
        res.json(suggestion);
    } catch (err) {
        console.error('Errore in suggestAsset:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { suggestAsset };