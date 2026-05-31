/**
 * @file Controller HTTP per le operazioni CRUD sugli asset DFD
 * @module controllers/assetController
 * 
 * @description
 * Gestisce le richieste HTTP per gli asset, delegando la logica business a assetService.
 * ✅ FIX BUG-006: Sostituito `throw err` con `res.status(500).json(...)` per coerenza.
 * 
 * @see {@link ../services/assetService.js} Service per logica business asset
 */

const assetService = require('../services/assetService');

/**
 * Recupera tutti gli asset del progetto attivo.
 * @async
 * @param {Object} req - Express request
 * @param {string} [req.projectDir] - Directory del progetto
 * @param {Object} res - Express response
 */
const getAllAssets = async (req, res) => {
    try {
        const assets = await assetService.getAllAssets(req.projectDir);
        res.json(assets);
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in getAllAssets:', err.message);
        res.status(500).json({ error: 'Impossibile recuperare gli asset' });
    }
};

/**
 * Crea un nuovo asset.
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.body - Dati dell'asset
 * @param {string} [req.projectDir] - Directory del progetto
 * @param {Object} res - Express response
 */
const createAsset = async (req, res) => {
    try {
        const { name, category, description } = req.body;

        if (!name?.trim() || !category) {
            return res.status(400).json({
                error: 'I campi "name" e "category" sono obbligatori',
                field: !name?.trim() ? 'name' : 'category'
            });
        }

        const newAsset = await assetService.createAsset(
            { name, category, description },
            req.projectDir
        );

        res.status(201).json(newAsset);

    } catch (err) {
        // ✅ FIX BUG-006: res.status(500) invece di throw err
        if (err.message?.includes('obbligatorio')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in createAsset:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Aggiorna un asset esistente.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedAsset = await assetService.updateAsset(id, updates, req.projectDir);
        res.json(updatedAsset);

    } catch (err) {
        // ✅ FIX BUG-006: res.status(500) invece di throw err
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in updateAsset:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Elimina un asset con cascade delete per flussi orfani.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await assetService.deleteAsset(id, req.projectDir);
        res.json({ success: true, ...result });

    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in deleteAsset:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Importa asset in blocco con deduplica.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const importAssets = async (req, res) => {
    try {
        const { assets } = req.body;

        if (!Array.isArray(assets)) {
            return res.status(400).json({ error: 'Il campo "assets" deve essere un array' });
        }

        const result = await assetService.importAssets(assets, req.projectDir);
        res.json(result);

    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in importAssets:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    importAssets
};