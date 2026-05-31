/**
 * @file Layer API per le operazioni sui flussi DFD
 * @module api/flowsApi
 * 
 * @description
 * Centralizza tutte le chiamate HTTP relative ai flussi del Data Flow Diagram.
 * Utilizza `apiClient` preconfigurato con base URL, timeout e interceptor per la gestione errori.
 * Questo layer astrae le chiamate dirette ad axios, garantendo coerenza e facilitando il mocking nei test.
 * 
 * ## Funzioni esportate
 * - `getFlows()`: recupera tutti i flussi del progetto attivo
 * - `create(flowData)`: crea un nuovo flusso con validazione backend DFD
 * - `update(id, updates)`: aggiorna un flusso esistente (etichetta/descrizione)
 * - `deleteFlow(id)`: elimina un flusso dal modello
 * - `flowsApi`: oggetto namespace per import compatto
 * 
 * @see {@link ../config/api.js} Configurazione axios (apiClient)
 * @see {@link ../../backend/controllers/flowController.js} Backend controller con validazione DFD
 * @see {@link ../store/useThreatModelStore.js} Store Zustand che consuma queste API
 */

// ✅ IMPORT CORRETTO: named export da config/api.js
import { apiClient } from '../config/api';

/**
 * Recupera tutti i flussi del progetto attivo dal backend.
 * @async
 * @function getFlows
 * @returns {Promise<Array<Object>>} Lista di flussi con id, fromId, toId, label, description, createdAt
 * @throws {Error} Se la richiesta HTTP fallisce o il backend restituisce errore 5xx
 * @example
 * import { getFlows } from './flowsApi';
 * 
 * const flows = await getFlows();
 * console.log(flows); 
 * // → [{ id: "flow-1", fromId: "asset-a", toId: "asset-b", label: "HTTPS", ... }]
 */
export const getFlows = async () => {
    try {
        const response = await apiClient.get('/flows');
        return response.data;
    } catch (error) {
        console.error('Errore in flowsApi.getFlows:', error);
        throw error;
    }
};

/**
 * Crea un nuovo flusso nel progetto attivo, applicando le regole di validazione DFD Base.
 * @async
 * @function create
 * @param {Object} flowData - Dati del flusso da creare
 * @param {string} flowData.fromId - ID dell'asset sorgente (obbligatorio)
 * @param {string} flowData.toId - ID dell'asset destinazione (obbligatorio)
 * @param {string} flowData.label - Etichetta del flusso (obbligatoria)
 * @param {string} [flowData.description] - Descrizione opzionale del flusso
 * @returns {Promise<Object>} Il flusso creato con id generato (UUID v4) e timestamp createdAt
 * @throws {Error} Se la validazione DFD fallisce (400) o la richiesta non riesce (5xx/network)
 * @example
 * import { create } from './flowsApi';
 * 
 * try {
 *   const newFlow = await create({
 *     fromId: 'asset-ee-123',
 *     toId: 'asset-proc-456',
 *     label: 'Richiesta API',
 *     description: 'Chiamata HTTP verso il servizio di autenticazione'
 *   });
 *   console.log('Flusso creato:', newFlow.id);
 * } catch (err) {
 *   console.error('Validazione fallita:', err.response?.data?.error);
 * }
 */
export const create = async (flowData) => {
    try {
        const response = await apiClient.post('/flows', flowData);
        return response.data;
    } catch (error) {
        console.error('Errore in flowsApi.create:', error);
        throw error;
    }
};

/**
 * Aggiorna un flusso esistente nel progetto attivo.
 * Consente di modificare solo etichetta e descrizione, preservando fromId/toId.
 * @async
 * @function update
 * @param {string} id - ID univoco del flusso da aggiornare
 * @param {Object} updates - Campi da aggiornare (merge parziale)
 * @param {string} [updates.label] - Nuova etichetta del flusso
 * @param {string} [updates.description] - Nuova descrizione del flusso
 * @returns {Promise<Object>} Il flusso aggiornato con tutti i campi
 * @throws {Error} Se il flusso non esiste (404) o la richiesta fallisce
 * @example
 * import { update } from './flowsApi';
 * 
 * const updatedFlow = await update('flow-uuid-123', {
 *   label: 'HTTPS Crittografato',
 *   description: 'Aggiornato a TLS 1.3'
 * });
 * console.log('Etichetta aggiornata:', updatedFlow.label);
 */
export const update = async (id, updates) => {
    try {
        const response = await apiClient.put(`/flows/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error('Errore in flowsApi.update:', error);
        throw error;
    }
};

/**
 * Elimina un flusso esistente dal progetto attivo.
 * @async
 * @function deleteFlow
 * @param {string} id - ID univoco del flusso da eliminare
 * @returns {Promise<Object>} Conferma di eliminazione con messaggio di successo
 * @throws {Error} Se il flusso non esiste (404) o la richiesta fallisce
 * @example
 * import { deleteFlow } from './flowsApi';
 * 
 * try {
 *   const result = await deleteFlow('flow-uuid-123');
 *   console.log('Eliminazione confermata:', result.success);
 * } catch (err) {
 *   console.error('Impossibile eliminare:', err.message);
 * }
 */
export const deleteFlow = async (id) => {
    try {
        const response = await apiClient.delete(`/flows/${id}`);
        return response.data;
    } catch (error) {
        console.error('Errore in flowsApi.deleteFlow:', error);
        throw error;
    }
};

// ============================================================================
// EXPORT NAMESPACE & DEFAULT
// ============================================================================

/**
 * Oggetto namespace che raggruppa tutte le funzioni API per i flussi.
 * Utile per import compatti: `import { flowsApi } from './flowsApi'`
 * @constant {Object}
 * @property {Function} getFlows - Recupera tutti i flussi
 * @property {Function} create - Crea un nuovo flusso
 * @property {Function} update - Aggiorna un flusso esistente
 * @property {Function} delete - Elimina un flusso (alias di deleteFlow)
 * @example
 * import { flowsApi } from './flowsApi';
 * 
 * const flows = await flowsApi.getFlows();
 * const newFlow = await flowsApi.create({ fromId: 'a', toId: 'b', label: 'Test' });
 */
export const flowsApi = {
    getFlows,
    create,
    update,
    delete: deleteFlow
};

/**
 * Export default per compatibilità con vecchi import o preferenze di stile.
 * @example
 * import flowsApi from './flowsApi';
 * const flows = await flowsApi.getFlows();
 */
export default flowsApi;