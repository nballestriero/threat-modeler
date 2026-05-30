/**
 * @file Store centralizzato per la gestione dello stato dell'applicazione
 * @description Gestisce asset e flussi del threat model, con persistenza su backend
 * @module useThreatModelStore
 */

import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

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
 * @property {string} source - ID dell'asset sorgente
 * @property {string} target - ID dell'asset destinazione
 * @property {string} dataType - Tipo di dato scambiato
 * @property {string} [protocol] - Protocollo (es. HTTPS)
 * @property {string} [description] - Descrizione
 */

// Creazione dello store Zustand
const useThreatModelStore = create((set, get) => ({
    // ========== STATO ==========
    /** @type {Asset[]} */
    assets: [],
    /** @type {Flow[]} */
    flows: [],
    loading: false,
    error: null,
    /** Flag per evitare fetch multiple degli asset */
    assetsLoaded: false,
    /** Flag per evitare fetch multiple dei flussi */
    flowsLoaded: false,

    // ========== AZIONI PER ASSET ==========

    /**
     * Recupera tutti gli asset dal backend.
     * Utilizza il flag assetsLoaded per evitare chiamate ripetute.
     * @async
     * @returns {Promise<void>}
     */
    fetchAssets: async () => {
        const { assetsLoaded, loading } = get();
        if (assetsLoaded || loading) return;

        set({ loading: true, error: null });
        try {
            const response = await axios.get(`${API_BASE}/assets`);
            set({ assets: response.data, assetsLoaded: true, loading: false });
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
            const response = await axios.post(`${API_BASE}/assets`, assetData);
            const newAsset = response.data;
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
            const response = await axios.put(`${API_BASE}/assets/${id}`, updates);
            const updatedAsset = response.data;
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
     * Elimina un asset.
     * @param {string} id - ID dell'asset da eliminare
     * @returns {Promise<void>}
     */
    deleteAsset: async (id) => {
        set({ loading: true, error: null });
        try {
            await axios.delete(`${API_BASE}/assets/${id}`);
            set((state) => ({
                assets: state.assets.filter((a) => a.id !== id),
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
     * Utilizza il flag flowsLoaded.
     * @async
     * @returns {Promise<void>}
     */
    fetchFlows: async () => {
        const { flowsLoaded, loading } = get();
        if (flowsLoaded || loading) return;

        set({ loading: true, error: null });
        try {
            const response = await axios.get(`${API_BASE}/flows`);
            set({ flows: response.data, flowsLoaded: true, loading: false });
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
            const response = await axios.post(`${API_BASE}/flows`, flowData);
            const newFlow = response.data;
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
            const response = await axios.put(`${API_BASE}/flows/${id}`, updates);
            const updatedFlow = response.data;
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
            await axios.delete(`${API_BASE}/flows/${id}`);
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
     * Resetta manualmente i flag (utile per refresh forzato)
     */
    resetLoadedFlags: () => {
        set({ assetsLoaded: false, flowsLoaded: false });
    },
}));

// Esportazione sia come default che come nominativo per compatibilità con tutti i file esistenti
export default useThreatModelStore;
export { useThreatModelStore };