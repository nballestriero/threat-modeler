/**
 * @file Layer API per la configurazione dell'applicazione
 * @description Centralizza tutte le chiamate HTTP relative a: configurazione globale, test connessioni (Ollama, RAG, DB), e gestione modelli LLM.
 * @module api/configApi
 * 
 * @see {@link ../config/api.js} Instance axios configurata con VITE_API_BASE
 */

import { apiClient } from '../config/api'; // ✅ Nome esatto dell'export nominato

/**
 * Recupera la configurazione completa dell'applicazione.
 * @async
 * @returns {Promise<Object>} Oggetto configurazione con settings Ollama, RAG, progetto attivo, ecc.
 */
export const getConfig = async () => {
    const response = await apiClient.get('/config');
    return response.data;
};

/**
 * Aggiorna la configurazione dell'applicazione.
 * @async
 * @param {Object} configUpdates - Campi di configurazione da aggiornare (parziali)
 * @returns {Promise<Object>} Configurazione aggiornata
 */
export const updateConfig = async (configUpdates) => {
    const response = await apiClient.put('/config', configUpdates);
    return response.data;
};

/**
 * Recupera la lista dei modelli LLM disponibili in Ollama.
 * @async
 * @returns {Promise<string[]>} Array di nomi modello (es. ['llama3', 'mistral', 'phi3'])
 * @throws {Error} Se Ollama non è raggiungibile (gestito dal backend con fallback)
 */
export const getOllamaModels = async () => {
    const response = await apiClient.get('/ollama/models');
    return response.data;
};

/**
 * Testa la connettività verso un'istanza Ollama specificata.
 * @async
 * @param {Object} params - Parametri di connessione
 * @param {string} params.host - Host Ollama (default: 'http://localhost')
 * @param {string|number} params.port - Porta Ollama (default: 11434)
 * @returns {Promise<{connected: boolean, message: string}>} Esito del test con messaggio descrittivo
 */
export const testOllamaConnection = async ({ host, port }) => {
    const response = await apiClient.post('/ollama/test', { host, port });
    return response.data;
};

/**
 * Testa la connettività verso ChromaDB (RAG).
 * @async
 * @returns {Promise<{connected: boolean, message: string, collections?: string[]}>} 
 *          Esito del test, messaggio e (opzionale) lista collezioni disponibili
 */
export const testRagConnection = async () => {
    const response = await apiClient.post('/rag/test-connection');
    return response.data;
};

/**
 * Testa la connettività verso il database alternativo (se configurato).
 * @async
 * @returns {Promise<{connected: boolean, message: string}>} Esito del test con messaggio descrittivo
 */
export const testDatabaseConnection = async () => {
    const response = await apiClient.post('/test/db');
    return response.data;
};

/**
 * Resetta la configurazione ai valori di default.
 * @async
 * @returns {Promise<Object>} Configurazione resetta
 */
export const resetConfig = async () => {
    const response = await apiClient.post('/config/reset');
    return response.data;
};

/**
 * Namespace aggregato per export comodo (pattern namespace).
 * @example
 * import { configApi } from '../api/configApi';
 * const config = await configApi.getConfig();
 * const models = await configApi.getOllamaModels();
 */
export const configApi = {
    getConfig,
    updateConfig,
    getOllamaModels,
    testOllamaConnection,
    testRagConnection,
    testDatabaseConnection,
    resetConfig,
};

export default configApi;