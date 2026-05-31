/**
 * @file Servizio per la gestione dei flussi (business logic CRUD)
 * @module services/flowService
 * 
 * @description
 * Gestisce le operazioni CRUD per i flussi DFD, operando sul modello JSON condiviso
 * con gli asset. Supporta l'isolamento dei dati per progetto tramite `projectDir`.
 * 
 * ## Struttura dati flusso
 * ```json
 * {
 *   "id": "uuid-v4",
 *   "fromId": "asset-source-id",
 *   "toId": "asset-destination-id",
 *   "label": "Etichetta del flusso",
 *   "description": "Descrizione opzionale",
 *   "createdAt": "ISO-8601 timestamp"
 * }
 * ```
 * 
 * @see {@link ../models/assetModel.js} Modello dati condiviso asset+flows
 * @see {@link ../middleware/projectScope.js} Middleware che inietta req.projectDir
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} Flow
 * @property {string} id - Identificativo univoco UUID v4
 * @property {string} fromId - ID dell'asset sorgente
 * @property {string} toId - ID dell'asset destinazione
 * @property {string} label - Etichetta del flusso
 * @property {string} [description] - Descrizione opzionale
 * @property {string} createdAt - Timestamp ISO di creazione
 */

/**
 * Recupera tutti i flussi dal modello del progetto specifico.
 * @async
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Flow[]>} Lista di flussi, o array vuoto se nessuno presente
 * @example
 * const flows = await getAllFlows(req.projectDir);
 * console.log(flows.map(f => f.label));
 */
async function getAllFlows(projectDir) {
    const model = await loadModel(projectDir);
    return model.flows || [];
}

/**
 * Crea un nuovo flusso nel progetto specifico.
 * @async
 * @param {Object} flowData - Dati del flusso da creare
 * @param {string} flowData.fromId - ID dell'asset sorgente
 * @param {string} flowData.toId - ID dell'asset destinazione
 * @param {string} flowData.label - Etichetta del flusso
 * @param {string} [flowData.description] - Descrizione opzionale
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Flow>} Flusso creato con ID generato e timestamp
 * @example
 * const flow = await createFlow({
 *   fromId: 'asset-123',
 *   toId: 'asset-456',
 *   label: 'HTTPS Request'
 * }, req.projectDir);
 */
async function createFlow(flowData, projectDir) {
    const model = await loadModel(projectDir);
    const newFlow = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...flowData
    };

    // Assicura che l'array flows esista nel modello
    model.flows = model.flows || [];
    model.flows.push(newFlow);

    await saveModel(model, projectDir);
    return newFlow;
}

/**
 * Aggiorna un flusso esistente nel progetto specifico.
 * @async
 * @param {string} id - ID del flusso da aggiornare
 * @param {Object} updates - Campi da modificare (parziali)
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Flow>} Flusso aggiornato con tutti i campi
 * @throws {Error} Se il flusso con l'ID specificato non viene trovato
 * @example
 * const updated = await updateFlow('flow-123', {
 *   label: 'HTTPS Encrypted',
 *   description: 'Aggiornato con TLS 1.3'
 * }, req.projectDir);
 */
async function updateFlow(id, updates, projectDir) {
    const model = await loadModel(projectDir);

    // Assicura che l'array flows esista
    if (!model.flows) model.flows = [];

    const index = model.flows.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Flusso non trovato: ${id}`);

    // Merge sicuro: preserva ID, sovrascrive solo i campi forniti
    model.flows[index] = { ...model.flows[index], ...updates, id };

    await saveModel(model, projectDir);
    return model.flows[index];
}

/**
 * Elimina un flusso nel progetto specifico.
 * @async
 * @param {string} id - ID del flusso da eliminare
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<{success: boolean}>} Conferma eliminazione
 * @throws {Error} Se il flusso con l'ID specificato non viene trovato
 * @example
 * const result = await deleteFlow('flow-123', req.projectDir);
 * console.log(result.success); // → true
 */
async function deleteFlow(id, projectDir) {
    const model = await loadModel(projectDir);

    // Assicura che l'array flows esista
    if (!model.flows) model.flows = [];

    const initialLength = model.flows.length;
    model.flows = model.flows.filter(f => f.id !== id);

    if (model.flows.length === initialLength) {
        throw new Error(`Flusso non trovato: ${id}`);
    }

    await saveModel(model, projectDir);

    // ✅ Restituisci conferma
    return { success: true };
}

module.exports = {
    getAllFlows,
    createFlow,
    updateFlow,
    deleteFlow
};