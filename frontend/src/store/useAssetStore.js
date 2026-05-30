// frontend/src/store/useAssetStore.js
/**
 * Store Zustand per la gestione degli asset (CRUD, stato di caricamento)
 * @module store/useAssetStore
 */

import { create } from 'zustand';
import { assetsApi } from '../api/assetsApi';

export const useAssetStore = create((set, get) => ({
    /** @type {Array} Lista degli asset */
    assets: [],
    /** @type {boolean} True durante il caricamento iniziale o refresh */
    isLoading: false,
    /** @type {boolean} True durante operazioni di scrittura (create, update, delete) */
    isUpdating: false,
    /** @type {string|null} Messaggio di errore */
    error: null,

    /**
     * Recupera tutti gli asset dal backend
     * @async
     * @returns {Promise<void>}
     */
    fetchAssets: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await assetsApi.getAll();
            set({ assets: data, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    /**
     * Crea un nuovo asset
     * @async
     * @param {Object} assetData - Dati dell'asset (name, category, description)
     * @returns {Promise<Object>} Asset creato
     */
    createAsset: async (assetData) => {
        set({ isUpdating: true, error: null });
        try {
            const newAsset = await assetsApi.create(assetData);
            set((state) => ({ assets: [...state.assets, newAsset], isUpdating: false }));
            return newAsset;
        } catch (err) {
            set({ error: err.message, isUpdating: false });
            throw err;
        }
    },

    /**
     * Aggiorna un asset esistente
     * @async
     * @param {string} id - ID dell'asset
     * @param {Object} updates - Campi da aggiornare
     * @returns {Promise<Object>} Asset aggiornato
     */
    updateAsset: async (id, updates) => {
        set({ isUpdating: true, error: null });
        try {
            const updated = await assetsApi.update(id, updates);
            set((state) => ({
                assets: state.assets.map((a) => (a.id === id ? updated : a)),
                isUpdating: false
            }));
            return updated;
        } catch (err) {
            set({ error: err.message, isUpdating: false });
            throw err;
        }
    },

    /**
     * Elimina un asset
     * @async
     * @param {string} id - ID dell'asset
     * @returns {Promise<void>}
     */
    deleteAsset: async (id) => {
        set({ isUpdating: true, error: null });
        try {
            await assetsApi.delete(id);
            set((state) => ({
                assets: state.assets.filter((a) => a.id !== id),
                isUpdating: false
            }));
        } catch (err) {
            set({ error: err.message, isUpdating: false });
            throw err;
        }
    },

    /**
     * Importa una lista di asset
     * @async
     * @param {Array} assetList - Lista di asset da importare
     * @returns {Promise<{imported: number}>}
     */
    importAssets: async (assetList) => {
        set({ isUpdating: true, error: null });
        try {
            const result = await assetsApi.import(assetList);
            await get().fetchAssets(); // ricarica la lista
            set({ isUpdating: false });
            return result;
        } catch (err) {
            set({ error: err.message, isUpdating: false });
            throw err;
        }
    }
}));