import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const useThreatModelStore = create((set, get) => ({
    // Asset base (DFD)
    assets: [],
    flows: [],
    isLoading: false,
    error: null,

    fetchAssets: async () => {
        set({ isLoading: true });
        try {
            const res = await axios.get(`${API_BASE}/assets`);
            set({ assets: res.data, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },
    addAsset: async (asset) => {
        const res = await axios.post(`${API_BASE}/assets`, asset);
        set((state) => ({ assets: [...state.assets, res.data] }));
        return res.data;
    },
    updateAsset: async (id, updates) => {
        const res = await axios.put(`${API_BASE}/assets/${id}`, updates);
        set((state) => ({ assets: state.assets.map(a => a.id === id ? res.data : a) }));
        return res.data;
    },
    deleteAsset: async (id) => {
        await axios.delete(`${API_BASE}/assets/${id}`);
        set((state) => ({ assets: state.assets.filter(a => a.id !== id) }));
    },
    syncExtractedAssets: async (extractedAssets) => {
        const res = await axios.post(`${API_BASE}/assets/import`, { assets: extractedAssets });
        await get().fetchAssets();
        return res.data;
    },

    // Flussi
    fetchFlows: async () => {
        const res = await axios.get(`${API_BASE}/flows`);
        set({ flows: res.data });
    },
    addFlow: async (flow) => {
        const res = await axios.post(`${API_BASE}/flows`, flow);
        set((state) => ({ flows: [...state.flows, res.data] }));
        return res.data;
    },
    updateFlow: async (id, updates) => {
        const res = await axios.put(`${API_BASE}/flows/${id}`, updates);
        set((state) => ({ flows: state.flows.map(f => f.id === id ? res.data : f) }));
        return res.data;
    },
    deleteFlow: async (id) => {
        await axios.delete(`${API_BASE}/flows/${id}`);
        set((state) => ({ flows: state.flows.filter(f => f.id !== id) }));
    },

    // Asset avanzati (Fase 4)
    advancedAssets: [],
    fetchAdvancedAssets: async () => {
        try {
            const res = await axios.get(`${API_BASE}/advanced-assets`);
            set({ advancedAssets: res.data });
        } catch (err) {
            console.error('Errore fetchAdvancedAssets:', err);
        }
    },
    enrichAssets: async (assetIds) => {
        set({ isLoading: true });
        try {
            const res = await axios.post(`${API_BASE}/analyze/enrich-assets`, { assetIds });
            set({ advancedAssets: res.data, isLoading: false });
            return res.data;
        } catch (err) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },
    updateAdvancedAsset: async (id, updates) => {
        const res = await axios.put(`${API_BASE}/advanced-assets/${id}`, updates);
        set((state) => ({ advancedAssets: state.advancedAssets.map(a => a.id === id ? res.data : a) }));
        return res.data;
    },
    deleteAdvancedAsset: async (id) => {
        await axios.delete(`${API_BASE}/advanced-assets/${id}`);
        set((state) => ({ advancedAssets: state.advancedAssets.filter(a => a.id !== id) }));
    }
}));