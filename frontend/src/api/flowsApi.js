/**
 * API per la gestione dei flussi (Data Flow Diagram)
 * @module api/flowsApi
 */

import { apiClient } from '../config/api';

export const flowsApi = {
    /**
     * Recupera tutti i flussi
     * @returns {Promise<Array>}
     */
    getAll: () => apiClient.get('/flows').then(r => r.data),

    /**
     * Crea un nuovo flusso
     * @param {Object} flowData - { name, source, target, dataType?, description? }
     * @returns {Promise<Object>}
     */
    create: (flowData) => apiClient.post('/flows', flowData).then(r => r.data),

    /**
     * Aggiorna un flusso esistente
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    update: (id, updates) => apiClient.put(`/flows/${id}`, updates).then(r => r.data),

    /**
     * Elimina un flusso
     * @param {string} id
     * @returns {Promise<void>}
     */
    delete: (id) => apiClient.delete(`/flows/${id}`).then(r => r.data)
};