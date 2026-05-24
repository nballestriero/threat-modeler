import { create } from 'zustand';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const useThreatModelStore = create((set, get) => ({
  assets: [],
  isLoading: false,

  // Carica gli asset dal backend
  fetchAssets: async () => {
    set({ isLoading: true });
    try {
      const res = await axios.get(`${API_BASE}/assets`);
      set({ assets: res.data });
    } catch (err) {
      console.error('Errore fetch assets:', err);
      set({ assets: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // Salva nel backend e aggiorna globalmente tutti i componenti iscritti
  syncExtractedAssets: async (extractedAssets) => {
    if (!extractedAssets?.length) return;
    try {
      await axios.post(`${API_BASE}/assets/import`, { assets: extractedAssets });
      await get().fetchAssets(); // Triggera re-render di AssetInventory e futuri moduli
    } catch (err) {
      console.error('Errore import asset estratti:', err);
    }
  }
}));