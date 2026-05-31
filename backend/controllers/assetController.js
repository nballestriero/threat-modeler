/**
 * @file Controller HTTP per le operazioni CRUD sugli asset
 * @description Gestisce le richieste REST per asset: GET/POST/PUT/DELETE.
 *              Delega la business logic a {@link ../services/assetService}.
 *              Include validazione input e mappatura errori a codici HTTP appropriati.
 * @module controllers/assetController
 * @see {@link ../services/assetService} Business logic per asset
 * @see {@link ../routes/assets.js} Route definitions
 */

const assetService = require('../services/assetService');

/**
 * Recupera tutti gli asset e restituisce lista JSON.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 * @route GET /api/assets
 * @response {200} Array<Asset>
 * @response {500} { error: string }
 */
const getAllAssets = async (req, res) => {
    try {
        const assets = await assetService.getAllAssets();
        res.json(assets);
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in getAllAssets:', err.message);
        res.status(500).json({ error: 'Impossibile recuperare gli asset' });
    }
};

/**
 * Crea un nuovo asset con validazione input.
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.body - Dati asset
 * @param {string} req.body.name - Nome (obbligatorio)
 * @param {string} req.body.category - Categoria (obbligatoria)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 * @route POST /api/assets
 * @response {201} Asset
 * @response {400} { error: string, field?: string }
 * @response {500} { error: string }
 */
const createAsset = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ error: 'Il campo "name" è obbligatorio', field: 'name' });
        }
        if (!category?.trim()) {
            return res.status(400).json({ error: 'Il campo "category" è obbligatorio', field: 'category' });
        }
        const newAsset = await assetService.createAsset({ name, category, description });
        res.status(201).json(newAsset);
    } catch (err) {
        if (err.message?.includes('obbligatorio') || err.message?.includes('valid')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in createAsset:', err.message);
        throw err;
    }
};

/**
 * Aggiorna un asset esistente per ID.
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.params - URL params
 * @param {string} req.params.id - ID asset
 * @param {Object} req.body - Campi da aggiornare
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 * @route PUT /api/assets/:id
 * @response {200} Asset
 * @response {400} { error: string }
 * @response {404} { error: string }
 * @response {500} { error: string }
 */
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.name !== undefined && !updates.name.trim()) {
            return res.status(400).json({ error: 'Il campo "name" non può essere vuoto', field: 'name' });
        }
        const updated = await assetService.updateAsset(id, updates);
        res.json(updated);
    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message?.includes('obbligatorio')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in updateAsset:', err.message);
        throw err;
    }
};

/**
 * Elimina un asset per ID (con cascade delete per flussi orfani).
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.params - URL params
 * @param {string} req.params.id - ID asset
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 * @route DELETE /api/assets/:id
 * @response {200} { success: true, message: string, orphanFlowsDeleted: number }
 * @response {404} { error: string } - Asset non trovato
 * @response {500} { error: string } - Errore interno del server
 * @example
 * // Request: DELETE /api/assets/abc-123
 * // Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Asset abc-123 eliminato con successo",
 *   "orphanFlowsDeleted": 2
 * }
 */
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await assetService.deleteAsset(id);
        res.json(result);
    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in deleteAsset:', err.message);
        throw err;
    }
};

/**
 * Importa asset in blocco da estrazione LLM/RAG.
 * @async
 * @param {Object} req - Express request
 * @param {Array<Asset>} req.body.assets - Lista asset da importare
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 * @route POST /api/assets/import
 * @response {200} { saved: number, duplicates: number }
 * @response {500} { error: string }
 */
const importAssets = async (req, res) => {
    try {
        const { assets } = req.body;
        if (!Array.isArray(assets)) {
            return res.status(400).json({ error: 'Il campo "assets" deve essere un array' });
        }
        const result = await assetService.importAssets(assets);
        res.json(result);
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in importAssets:', err.message);
        res.status(500).json({ error: 'Impossibile importare gli asset' });
    }
};

module.exports = {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    importAssets
};