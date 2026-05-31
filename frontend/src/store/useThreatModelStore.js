/**
 * @file Store Zustand per la gestione di asset e flussi del threat model
 * @module store/useThreatModelStore
 * 
 * @description
 * Unica fonte di verità frontend per asset e flussi. Supporta:
 * - CRUD completo per asset e flussi con isolamento per progetto
 * - Flag loaded per prevenire fetch duplicati
 * - Cascade delete locale per flussi orfani
 * - Force reload per cambio progetto
 * 
 * @see {@link ../api/assetsApi.js} Layer API per asset
 * @see {@link ../api/flowsApi.js} Layer API per flussi
 */

import { create } from 'zustand';
import { assetsApi } from '../api/assetsApi';
import { flowsApi } from '../api/flowsApi';

/**
 * Stato iniziale dello store
 * @type {Object}
 */
const initialState = {
    assets: [],
    flows: [],
    assetsLoaded: false,
    flowsLoaded: false,
    loading: false,
    error: null
};

/**
 * Store Zustand per asset e flussi
 * @function useThreatModelStore
 * @returns {Object} Stato e azioni dello store
 */
export const useThreatModelStore = create((set, get) => ({
    ...initialState,

    /**
     * Resetta lo stato dello store
     */
    reset: () => set(initialState),

    /**
     * Resetta i flag loaded per forzare un nuovo fetch
     */
    resetLoadedFlags: () => set({ assetsLoaded: false, flowsLoaded: false }),

    /**
     * Recupera tutti gli asset dal backend.
     * Supporta force reload per cambio progetto.
     * @async
     * @param {boolean} force - Forza il fetch anche se assetsLoaded è true
     * @returns {Promise}
     */
    fetchAssets: async (force = false) => {
        const { assetsLoaded, loading } = get();
        if ((assetsLoaded || loading) && !force) return;

        set({ loading: true, error: null });
        try {
            const data = await assetsApi.getAll();
            set({ assets: data, assetsLoaded: true, loading: false });
        } catch (error) {
            console.error('Errore fetchAssets:', error);
            set({ error: error.message, loading: false, assetsLoaded: false });
            throw error;
        }
    },

    /**
     * Recupera tutti i flussi dal backend.
     * Supporta force reload per cambio progetto.
     * @async
     * @param {boolean} force - Forza il fetch anche se flowsLoaded è true
     * @returns {Promise}
     */
    fetchFlows: async (force = false) => {
        const { flowsLoaded, loading } = get();
        if ((flowsLoaded || loading) && !force) return;

        set({ loading: true, error: null });
        try {
            const data = await flowsApi.getFlows();
            set({ flows: data, flowsLoaded: true, loading: false });
        } catch (error) {
            console.error('Errore fetchFlows:', error);
            set({ error: error.message, loading: false, flowsLoaded: false });
            throw error;
        }
    },

    /**
     * Aggiunge un nuovo asset.
     * @async
     * @param {Object} assetData - Dati dell'asset (name, category, description)
     * @returns {Promise} Il nuovo asset creato
     */
    addAsset: async (assetData) => {
        set({ loading: true, error: null });
        try {
            const newAsset = await assetsApi.create(assetData);
            set((state) => ({
                assets: [...state.assets, newAsset],
                assetsLoaded: true,
                loading: false
            }));
            return newAsset;
        } catch (error) {
            console.error('Errore addAsset:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Aggiorna un asset esistente.
     * @async
     * @param {string} id - ID dell'asset
     * @param {Object} updates - Campi da aggiornare
     * @returns {Promise} L'asset aggiornato
     */
    updateAsset: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updatedAsset = await assetsApi.update(id, updates);
            set((state) => ({
                assets: state.assets.map((a) => (a.id === id ? updatedAsset : a)),
                loading: false,
            }));
            return updatedAsset;
        } catch (error) {
            console.error('Errore updateAsset:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Elimina un asset e i flussi orfani correlati (cascade delete).
     * @async
     * @param {string} id - ID dell'asset da eliminare
     * @returns {Promise} Result con conteggio flussi eliminati
     */
    deleteAsset: async (id) => {
        set({ loading: true, error: null });
        try {
            const result = await assetsApi.delete(id);
            set((state) => {
                // Rimuovi l'asset
                const newAssets = state.assets.filter((a) => a.id !== id);
                // Rimuovi flussi orfani (cascade delete locale)
                const newFlows = state.flows.filter(
                    (f) => f.fromId !== id && f.toId !== id
                );
                return {
                    assets: newAssets,
                    flows: newFlows,
                    assetsLoaded: true,
                    flowsLoaded: true,
                    loading: false,
                };
            });
            return result;
        } catch (error) {
            console.error('Errore deleteAsset:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Importa asset in blocco con deduplica.
     * @async
     * @param {Array} assets - Lista di asset da importare
     * @returns {Promise} Result con conteggi saved/duplicates
     */
    importAssets: async (assets) => {
        set({ loading: true, error: null });
        try {
            const result = await assetsApi.importBulk(assets);
            // Ricarica tutti gli asset dopo import
            const allAssets = await assetsApi.getAll();
            set({ assets: allAssets, assetsLoaded: true, loading: false });
            return result;
        } catch (error) {
            console.error('Errore importAssets:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Aggiunge un nuovo flusso.
     * @async
     * @param {Object} flowData - Dati del flusso (fromId, toId, label)
     * @returns {Promise} Il flusso creato
     */
    addFlow: async (flowData) => {
        set({ loading: true, error: null });
        try {
            const newFlow = await flowsApi.create(flowData);
            set((state) => ({
                flows: [...state.flows, newFlow],
                flowsLoaded: true,
                loading: false
            }));
            return newFlow;
        } catch (error) {
            console.error('Errore addFlow:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Aggiorna un flusso esistente.
     * @async
     * @param {string} id - ID del flusso
     * @param {Object} updates - Campi da aggiornare
     * @returns {Promise} Il flusso aggiornato
     */
    updateFlow: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updatedFlow = await flowsApi.update(id, updates);
            set((state) => ({
                flows: state.flows.map((f) => (f.id === id ? updatedFlow : f)),
                loading: false,
            }));
            return updatedFlow;
        } catch (error) {
            console.error('Errore updateFlow:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Elimina un flusso.
     * @async
     * @param {string} id - ID del flusso da eliminare
     * @returns {Promise}
     */
    deleteFlow: async (id) => {
        set({ loading: true, error: null });
        try {
            await flowsApi.delete(id);
            set((state) => ({
                flows: state.flows.filter((f) => f.id !== id),
                loading: false,
            }));
        } catch (error) {
            console.error('Errore deleteFlow:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    /**
     * Imposta un errore manuale (utile per validazioni UI)
     * @param {string|null} message - Messaggio di errore o null per pulire
     */
    setError: (message) => set({ error: message }),

    /**
     * Pulisce l'errore corrente
     */
    clearError: () => set({ error: null })
}));