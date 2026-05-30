/**
 * @file Layer API per la gestione degli asset
 * @description Centralizza le chiamate CRUD e l'importazione massiva di asset.
 * @module api/assetsApi
 * 
 * @see {@link ../config/api.js} Istanza axios configurata
 */

import { apiClient } from '../config/api';

/**
 * @typedef {Object} Asset
 * @property {string} id - Identificativo univoco
 * @property {string} name - Nome dell'asset
 * @property {string} description - Descrizione dettagliata
 * @property {string} type - Tipo (es. External Entity, Process)
 * @property {string} [category] - Categoria specifica della metodologia
 * @property {Array} [tags] - Tag associati
 */

/**
 * Oggetto che espone i metodi per la gestione degli asset.
 */
export const assetsApi = {

    /**
     * Recupera tutti gli asset dal backend.
     * @async
     * @returns {Promise<Asset[]>} Lista completa degli asset
     */
    getAll: async () => {
        const response = await apiClient.get('/assets');
        return response.data;
    },

    /**
     * Crea un nuovo asset.
     * @async
     * @param {Object} assetData - Dati del nuovo asset (senza ID)
     * @returns {Promise<Asset>} L'asset creato con ID assegnato
     */
    create: async (assetData) => {
        const response = await apiClient.post('/assets', assetData);
        return response.data;
    },

    /**
     * Aggiorna un asset esistente.
     * @async
     * @param {string} id - ID dell'asset da aggiornare
     * @param {Partial<Asset>} updates - Campi da modificare
     * @returns {Promise<Asset>} L'asset aggiornato
     */
    update: async (id, updates) => {
        const response = await apiClient.put(`/assets/${id}`, updates);
        return response.data;
    },

    /**
     * Elimina un asset.
     * @async
     * @param {string} id - ID dell'asset da eliminare
     * @returns {Promise<void>}
     */
    delete: async (id) => {
        await apiClient.delete(`/assets/${id}`);
    },

    /**
     * Importa una lista di asset in blocco.
     * Utile per l'estrazione iniziale da documenti o migrazioni.
     * @async
     * @param {Asset[]} assets - Array di asset da importare
     * @returns {Promise<{count: number, imported: Asset[]}>} Riepilogo dell'importazione
     */
    import: async (assets) => {
        const response = await apiClient.post('/assets/import', { assets });
        return response.data;
    }
};

export default assetsApi;