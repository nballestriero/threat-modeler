/**
 * @file Layer API per la gestione dei flussi (Data Flow Diagram)
 * @description Centralizza tutte le chiamate HTTP relative ai flussi DFD (CRUD).
 * @module api/flowsApi
 * 
 * @see {@link ../config/api.js} Instance axios configurata con VITE_API_BASE
 */

import { apiClient } from '../config/api'; // ✅ Nome esatto dell'export

/**
 * Recupera tutti i flussi dal backend.
 * @async
 * @returns {Promise<Array<{id: string, fromId: string, toId: string, label: string}>>} Lista dei flussi
 */
export const getFlows = async () => {
    const response = await apiClient.get('/flows');
    return response.data;
};

/**
 * Crea un nuovo flusso.
 * @async
 * @param {Object} flowData - Dati del flusso da creare
 * @param {string} flowData.fromId - ID asset sorgente
 * @param {string} flowData.toId - ID asset destinazione
 * @param {string} flowData.label - Etichetta del flusso
 * @returns {Promise<Object>} Flusso creato con ID generato dal backend
 */
export const createFlow = async (flowData) => {
    const response = await apiClient.post('/flows', flowData);
    return response.data;
};

/**
 * Aggiorna un flusso esistente.
 * @async
 * @param {string} id - ID del flusso da aggiornare
 * @param {Object} updates - Campi da modificare (es. { label: 'nuova etichetta' })
 * @returns {Promise<Object>} Flusso aggiornato
 */
export const updateFlow = async (id, updates) => {
    const response = await apiClient.put(`/flows/${id}`, updates);
    return response.data;
};

/**
 * Elimina un flusso.
 * @async
 * @param {string} id - ID del flusso da eliminare
 * @returns {Promise<void>}
 */
export const deleteFlow = async (id) => {
    await apiClient.delete(`/flows/${id}`);
};

/**
 * Namespace aggregato per import comodo e coerente con gli altri layer API.
 * @example
 * import { flowsApi } from '../api/flowsApi';
 * 
 * const flows = await flowsApi.getFlows();
 * await flowsApi.createFlow({ fromId: 'asset1', toId: 'asset2', label: 'HTTPS' });
 */
export const flowsApi = {
    getFlows,
    createFlow,
    updateFlow,
    deleteFlow,
};

export default flowsApi;