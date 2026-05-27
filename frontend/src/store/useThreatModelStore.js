import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const useThreatModelStore = create((set, get) => ({
    assets: [],
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
        try {
            const res = await axios.post(`${API_BASE}/assets`, asset);
            set((state) => ({ assets: [...state.assets, res.data] }));
            return res.data;
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    },

    updateAsset: async (id, updates) => {
        try {
            const res = await axios.put(`${API_BASE}/assets/${id}`, updates);
            set((state) => ({
                assets: state.assets.map(a => a.id === id ? res.data : a)
            }));
            return res.data;
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    },

    deleteAsset: async (id) => {
        try {
            await axios.delete(`${API_BASE}/assets/${id}`);
            set((state) => ({ assets: state.assets.filter(a => a.id !== id) }));
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    },

    syncExtractedAssets: async (extractedAssets) => {
        try {
            const res = await axios.post(`${API_BASE}/assets/import`, { assets: extractedAssets });
            await get().fetchAssets();
            return res.data;
        } catch (err) {
            set({ error: err.message });
            throw err;
        }
    }
}));