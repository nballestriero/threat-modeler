/**
 * @file Store centralizzato per la gestione dello stato dell'applicazione
 * @module useThreatModelStore
 */

import { create } from 'zustand';
import { assetsApi } from '../api/assetsApi';
import { flowsApi } from '../api/flowsApi';

const useThreatModelStore = create((set, get) => ({
    assets: [],
    flows: [],
    loading: false,
    error: null,
    assetsLoaded: false,
    flowsLoaded: false,

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
        }
    },

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
        }
    },

    addAsset: async (assetData) => {
        set({ loading: true, error: null });
        try {
            const newAsset = await assetsApi.create(assetData);
            // Aggiorna lo stato IMMEDIATAMENTE
            set((state) => ({
                assets: [...state.assets, newAsset],
                loading: false,
                error: null
            }));
        } catch (error) {
            console.error('Errore addAsset:', error);
            const msg = error.response?.data?.error || error.message || 'Errore sconosciuto';
            set({ error: msg, loading: false });
            // Mostra alert visivo all'utente
            alert(`❌ Errore creazione asset: ${msg}`);
        }
    },

    updateAsset: async (id, updates) => {
        set({ loading: true, error: null });
        try {
            const updated = await assetsApi.update(id, updates);
            set((state) => ({
                assets: state.assets.map((a) => (a.id === id ? updated : a)),
                loading: false
            }));
        } catch (error) {
            console.error('Errore updateAsset:', error);
            set({ error: error.message, loading: false });
            alert(`❌ Errore aggiornamento: ${error.response?.data?.error || error.message}`);
        }
    },

    deleteAsset: async (id) => {
        set({ loading: true, error: null });
        try {
            await assetsApi.delete(id);
            set((state) => ({
                assets: state.assets.filter((a) => a.id !== id),
                flows: state.flows.filter((f) => f.fromId !== id && f.toId !== id),
                loading: false
            }));
        } catch (error) {
            console.error('Errore deleteAsset:', error);
            set({ error: error.message, loading: false });
            alert(`❌ Errore eliminazione: ${error.response?.data?.error || error.message}`);
        }
    },

    // ... (azioni flussi rimangono identiche, usa flowsApi) ...
    addFlow: async (data) => { /* ... */ },
    updateFlow: async (id, data) => { /* ... */ },
    deleteFlow: async (id) => { /* ... */ },

    resetLoadedFlags: () => set({ assetsLoaded: false, flowsLoaded: false }),
}));

export default useThreatModelStore;
export { useThreatModelStore };