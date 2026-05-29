// backend/services/flowService.js
/**
 * @file Servizio per la gestione dei flussi di dati (Data Flow Diagram)
 * @module services/flowService
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Recupera tutti i flussi
 * @async
 * @returns {Promise<Array>} Lista dei flussi
 */
async function getAllFlows() {
    const model = await loadModel();
    return model.flows || [];
}

/**
 * Crea un nuovo flusso
 * @async
 * @param {Object} flowData - Dati del flusso
 * @param {string} flowData.name - Nome del flusso
 * @param {string} flowData.source - ID o nome asset sorgente
 * @param {string} flowData.target - ID o nome asset destinazione
 * @param {string} [flowData.dataType] - Tipo di dati scambiati
 * @param {string} [flowData.description] - Descrizione
 * @returns {Promise<Object>} Flusso creato
 */
async function createFlow(flowData) {
    const model = await loadModel();
    if (!model.flows) model.flows = [];
    const newFlow = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...flowData
    };
    model.flows.push(newFlow);
    await saveModel(model);
    return newFlow;
}

/**
 * Aggiorna un flusso esistente
 * @async
 * @param {string} id - ID del flusso
 * @param {Object} updates - Dati da aggiornare
 * @returns {Promise<Object>} Flusso aggiornato
 * @throws {Error} Se il flusso non esiste
 */
async function updateFlow(id, updates) {
    const model = await loadModel();
    if (!model.flows) throw new Error(`Flusso non trovato: ${id}`);
    const index = model.flows.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Flusso non trovato: ${id}`);
    const updated = { ...model.flows[index], ...updates, id };
    model.flows[index] = updated;
    await saveModel(model);
    return updated;
}

/**
 * Elimina un flusso
 * @async
 * @param {string} id - ID del flusso
 * @returns {Promise<{success: boolean}>}
 * @throws {Error} Se il flusso non esiste
 */
async function deleteFlow(id) {
    const model = await loadModel();
    if (!model.flows) throw new Error(`Flusso non trovato: ${id}`);
    const initialLength = model.flows.length;
    model.flows = model.flows.filter(f => f.id !== id);
    if (model.flows.length === initialLength) throw new Error(`Flusso non trovato: ${id}`);
    await saveModel(model);
    return { success: true };
}

module.exports = { getAllFlows, createFlow, updateFlow, deleteFlow };