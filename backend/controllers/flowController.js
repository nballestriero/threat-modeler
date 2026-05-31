/**
 * @file Controller HTTP per le operazioni CRUD sui flussi
 * @module controllers/flowController
 * 
 * @description
 * Gestisce le richieste REST per i flussi, delegando la business logic
 * a {@link ../services/flowService}. Include validazione input per fromId/toId
 * obbligatori e gestione errori appropriata.
 * 
 * @see {@link ../services/flowService.js} Business logic per flussi
 * @see {@link ../middleware/projectScope.js} Middleware che inietta req.projectDir
 */

const flowService = require('../services/flowService');

/**
 * Recupera tutti i flussi e restituisce lista JSON.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route GET /api/flows
 * @response {200} Array<Flow> - Lista completa dei flussi
 * @response {500} { error: string } - Errore interno del server
 */
const getAllFlows = async (req, res) => {
    try {
        const flows = await flowService.getAllFlows(req.projectDir);
        res.json(flows);
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in getAllFlows:', err.message);
        res.status(500).json({ error: 'Impossibile recuperare i flussi' });
    }
};

/**
 * Crea un nuovo flusso con validazione input.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.body - Dati del flusso da creare
 * @param {string} req.body.fromId - ID asset sorgente (obbligatorio)
 * @param {string} req.body.toId - ID asset destinazione (obbligatorio)
 * @param {string} req.body.label - Etichetta del flusso (obbligatoria)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route POST /api/flows
 * @requestBody {Object} Flusso senza id
 * @response {201} Flow - Flusso creato con id generato
 * @response {400} { error: string, field?: string } - Validazione fallita
 * @response {500} { error: string } - Errore interno del server
 */
const createFlow = async (req, res) => {
    try {
        const { fromId, toId, label, description } = req.body;

        // Validazione esplicita: fromId e toId sono obbligatori
        if (!fromId?.trim()) {
            return res.status(400).json({
                error: 'Il campo "fromId" è obbligatorio',
                field: 'fromId'
            });
        }
        if (!toId?.trim()) {
            return res.status(400).json({
                error: 'Il campo "toId" è obbligatorio',
                field: 'toId'
            });
        }
        if (!label?.trim()) {
            return res.status(400).json({
                error: 'Il campo "label" è obbligatorio',
                field: 'label'
            });
        }

        const newFlow = await flowService.createFlow({ fromId, toId, label, description }, req.projectDir);
        res.status(201).json(newFlow);

    } catch (err) {
        if (err.message?.includes('obbligatorio')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in createFlow:', err.message);
        throw err;
    }
};

/**
 * Aggiorna un flusso esistente per ID.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parametri URL
 * @param {string} req.params.id - ID del flusso da aggiornare
 * @param {Object} req.body - Campi da aggiornare (parziali)
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route PUT /api/flows/:id
 * @requestBody {Object} Campi da aggiornare (label, description, fromId, toId)
 * @response {200} Flow - Flusso aggiornato
 * @response {400} { error: string } - Validazione fallita
 * @response {404} { error: string } - Flusso non trovato
 * @response {500} { error: string } - Errore interno del server
 */
const updateFlow = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validazione: se si aggiornano fromId/toId, non devono essere vuoti
        if (updates.fromId !== undefined && !updates.fromId.trim()) {
            return res.status(400).json({ error: 'fromId non può essere vuoto', field: 'fromId' });
        }
        if (updates.toId !== undefined && !updates.toId.trim()) {
            return res.status(400).json({ error: 'toId non può essere vuoto', field: 'toId' });
        }

        const updated = await flowService.updateFlow(id, updates, req.projectDir);
        res.json(updated);

    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message?.includes('obbligatorio')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in updateFlow:', err.message);
        throw err;
    }
};

/**
 * Elimina un flusso per ID.
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parametri URL
 * @param {string} req.params.id - ID del flusso da eliminare
 * @param {string} [req.projectDir] - Directory del progetto attivo
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * 
 * @route DELETE /api/flows/:id
 * @response {200} { success: true, message: string } - Eliminazione confermata
 * @response {404} { error: string } - Flusso non trovato
 * @response {500} { error: string } - Errore interno del server
 */
const deleteFlow = async (req, res) => {
    try {
        const { id } = req.params;
        await flowService.deleteFlow(id, req.projectDir);
        res.json({ success: true, message: `Flusso ${id} eliminato con successo` });
    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in deleteFlow:', err.message);
        throw err;
    }
};

module.exports = {
    getAllFlows,
    createFlow,
    updateFlow,
    deleteFlow
};