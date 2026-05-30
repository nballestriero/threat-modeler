/**
 * @file Store centralizzato per la gestione dello stato dell'applicazione
 * @description Gestisce asset e flussi del threat model in modo monolitico, con persistenza su backend e pulizia automatica dei collegamenti orfani.
 * @module useThreatModelStore
 * 
 * @see {@link ../api/assetsApi.js} Layer API per operazioni CRUD su asset
 * @see {@link ../api/flowsApi.js} Layer API per operazioni CRUD su flussi
 */

import { create } from 'zustand';
import { assetsApi } from '../api/assetsApi';
import { flowsApi } from '../api/flowsApi';

/**
 * @typedef {Object} Asset
 * @property {string} id - Identificativo univoco
 * @property {string} name - Nome dell'asset
 * @property {string} description - Descrizione
 * @property {string} type - Tipo (es. "External Entity", "Process", "Data Store")
 * @property {string} [category] - Categoria opzionale
 * @property {string[]} [tags] - Tag associati
 */

/**
 * @typedef {Object} Flow
 * @property {string} id - Identificativo univoco
 * @property {string} fromId - ID dell'asset sorgente
 * @property {string} toId - ID dell'asset destinazione
 * @property {string} label - Etichetta del flusso
 */

const useThreatModelStore = create((set, get) => ({
    // ========== STATO ==========
    /** @type {Asset[]} */
    assets: [],
    /** @type {Flow[]} */
    flows: [],
    loading: false,
    error: null,
    assetsLoaded: false,
    flowsLoaded: false,

    // ========== AZIONI PER ASSET ==========

    /**
     * Recupera tutti gli asset dal backend.
     * @async
     * @returns {Promise<void>}
     */
    fetchAssets: async () => {
        const { assetsLoaded, loading } = get();
        if (assetsLoaded || loading) return;

        set({ loading: true, error: null });
        try {
            const data = await assetsApi.getAll();
            set({ assets: data, assetsLoaded: true, loading: false });
        } catch (error) {
            console.error('Errore fetchAssets:', error);
            set({ error: error.message, loading: false, assetsLoaded: false });
        }
    },

    /**
     * Aggiunge un nuovo asset.
     * @param {Omit<Asset, 'id'>} assetData - Dati del nuovo asset (senza id)
     * @returns {Promise<void>}
     */
    addAsset: async (assetData) => {
        set({ loading: true, error: null });
        try {
            const newAsset = await assetsApi.create(assetData);
            set((state) => ({ assets: [...state.assets, newAsset], loading: false }));
        } catch (error) {
            console.error('Errore addAsset:', error);
            set({ error: error.message, loading: false });
        }
    },

    /**
     * Aggiorna un asset esistente.
     * @param {string} id - ID dell'asset da aggiornare
     * @param {Partial<Asset>} updates - Campi da modificare
     * @returns {Promise<void>}
     */
    updateAsset: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updatedAsset = await assetsApi.update(id, updates);
            set((state) => ({
                assets: state.assets.map((a) => (a.id === id ? updatedAsset : a)),
                loading: false,
            }));
        } catch (error) {
            console.error('Errore updateAsset:', error);
            set({ error: error.message, loading: false });
        }
    },

    /**
     * Elimina un asset e pulisce automaticamente i flussi orfani associati.
     * @param {string} id - ID dell'asset da eliminare
     * @returns {Promise<void>}
     */
    deleteAsset: async (id) => {
        set({ loading: true, error: null });
        try {
            await assetsApi.delete(id);
            set((state) => ({
                assets: state.assets.filter((a) => a.id !== id),
                flows: state.flows.filter((f) => f.fromId !== id && f.toId !== id),
                loading: false,
            }));
        } catch (error) {
            console.error('Errore deleteAsset:', error);
            set({ error: error.message, loading: false });
        }
    },

    // ========== AZIONI PER FLUSSI ==========

    /**
     * Recupera tutti i flussi dal backend.
     * @async
     * @returns {Promise<void>}
     */
    fetchFlows: async () => {
        const { flowsLoaded, loading } = get();
        if (flowsLoaded || loading) return;

        set({ loading: true, error: null });
        try {
            const data = await flowsApi.getFlows();
            set({ flows: data, flowsLoaded: true, loading: false });
        } catch (error) {
            console.error('Errore fetchFlows:', error);
            set({ error: error.message, loading: false, flowsLoaded: false });
        }
    },

    /**
     * Aggiunge un nuovo flusso.
     * @param {Omit<Flow, 'id'>} flowData
     * @returns {Promise<void>}
     */
    addFlow: async (flowData) => {
        set({ loading: true, error: null });
        try {
            const newFlow = await flowsApi.createFlow(flowData);
            set((state) => ({ flows: [...state.flows, newFlow], loading: false }));
        } catch (error) {
            console.error('Errore addFlow:', error);
            set({ error: error.message, loading: false });
        }
    },

    /**
     * Aggiorna un flusso.
     * @param {string} id
     * @param {Partial<Flow>} updates
     * @returns {Promise<void>}
     */
    updateFlow: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updatedFlow = await flowsApi.updateFlow(id, updates);
            set((state) => ({
                flows: state.flows.map((f) => (f.id === id ? updatedFlow : f)),
                loading: false,
            }));
        } catch (error) {
            console.error('Errore updateFlow:', error);
            set({ error: error.message, loading: false });
        }
    },

    /**
     * Elimina un flusso.
     * @param {string} id
     * @returns {Promise<void>}
     */
    deleteFlow: async (id) => {
        set({ loading: true, error: null });
        try {
            await flowsApi.deleteFlow(id);
            set((state) => ({
                flows: state.flows.filter((f) => f.id !== id),
                loading: false,
            }));
        } catch (error) {
            console.error('Errore deleteFlow:', error);
            set({ error: error.message, loading: false });
        }
    },

    // ========== UTILITY ==========

    /**
     * Resetta manualmente i flag di caricamento.
     */
    resetLoadedFlags: () => {
        set({ assetsLoaded: false, flowsLoaded: false });
    },
}));

export default useThreatModelStore;
export { useThreatModelStore };