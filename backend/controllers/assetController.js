/**
 * @file Controller HTTP per le operazioni CRUD sugli asset
 * @module controllers/assetController
 * 
 * @description
 * Gestisce le richieste REST per gli asset, delegando la business logic
 * a {@link ../services/assetService}. Include validazione input, gestione errori
 * e mappatura a codici HTTP appropriati. Supporta isolamento dati per progetto
 * tramite `req.projectDir`.
 * 
 * @see {@link ../services/assetService.js} Business logic per asset
 * @see {@link ../middleware/projectScope.js} Middleware che inietta req.projectDir
 */

const assetService = require('../services/assetService');

/**
 * Recupera tutti gli asset e restituisce lista JSON.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {string} [req.projectDir] - Directory del progetto attivo (iniettata da middleware)
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route GET /api/assets
 * @response {200} Array<Asset> - Lista completa degli asset
 * @response {500} { error: string } - Errore interno del server
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
 * Crea un nuovo asset con validazione input.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.body - Dati dell'asset da creare
 * @param {string} req.body.name - Nome dell'asset (obbligatorio)
 * @param {string} req.body.category - Categoria DFD (obbligatoria)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route POST /api/assets
 * @requestBody {Object} Asset senza id
 * @response {201} Asset - Asset creato con id generato
 * @response {400} { error: string, field?: string } - Validazione fallita
 * @response {500} { error: string } - Errore interno del server
 */
const createAsset = async (req, res) => {
    try {
        const { name, category, description } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                error: 'Il campo "name" è obbligatorio e non può essere vuoto',
                field: 'name'
            });
        }
        if (!category?.trim()) {
            return res.status(400).json({
                error: 'Il campo "category" è obbligatorio',
                field: 'category'
            });
        }

        const newAsset = await assetService.createAsset({ name, category, description }, req.projectDir);
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
 * Importa asset in blocco da estrazione LLM/RAG.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Array<Asset>} req.body.assets - Lista di asset da importare
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route POST /api/assets/import
 * @requestBody {Object} { assets: Array<Asset> }
 * @response {200} { saved: number, duplicates: number } - Riepilogo importazione
 * @response {400} { error: string } - Formato payload non valido
 * @response {500} { error: string } - Errore interno del server
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
        res.status(500).json({ error: 'Impossibile importare gli asset' });
    }
};

/**
 * Aggiorna un asset esistente per ID.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parametri URL
 * @param {string} req.params.id - ID dell'asset da aggiornare
 * @param {Object} req.body - Campi da aggiornare (parziali)
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route PUT /api/assets/:id
 * @requestBody {Object} Campi da aggiornare (name, category, description)
 * @response {200} Asset - Asset aggiornato
 * @response {400} { error: string } - Validazione fallita
 * @response {404} { error: string } - Asset non trovato
 * @response {500} { error: string } - Errore interno del server
 */
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.name !== undefined && !updates.name.trim()) {
            return res.status(400).json({
                error: 'Il campo "name" non può essere vuoto',
                field: 'name'
            });
        }

        const updated = await assetService.updateAsset(id, updates, req.projectDir);
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
 * Elimina un asset per ID con cascade delete per flussi orfani.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parametri URL
 * @param {string} req.params.id - ID dell'asset da eliminare
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route DELETE /api/assets/:id
 * @response {200} { success: true, message: string, orphanFlowsDeleted: number } - Eliminazione confermata con conteggio flussi rimossi
 * @response {404} { error: string } - Asset non trovato
 * @response {500} { error: string } - Errore interno del server
 * 
 * @example
 * // Request: DELETE /api/assets/abc-123
 * // Response: 200 OK
 * {
 *   "success": true,
 *   "message": "Asset abc-123 eliminato",
 *   "orphanFlowsDeleted": 2
 * }
 */
const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ assetService.deleteAsset ora restituisce { orphanFlowsDeleted }
        const { orphanFlowsDeleted } = await assetService.deleteAsset(id, req.projectDir);

        res.json({
            success: true,
            message: `Asset ${id} eliminato con successo`,
            orphanFlowsDeleted // ✅ Incluso nella response per feedback frontend
        });
    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in deleteAsset:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllAssets,
    createAsset,
    importAssets,
    updateAsset,
    deleteAsset
};