/**
 * Store Zustand per la gestione della fase corrente dell'applicazione
 * @module store/useAppStore
 */

import { create } from 'zustand';

export const useAppStore = create((set) => ({
    /** @type {number} Fase corrente (1: Documenti, 2: Asset, 3: DFD, 4: Metodologie, 5: Vista DFD metodologia) */
    currentPhase: 1,
    /**
     * Imposta la fase corrente
     * @param {number} phase - Numero della fase (da 1 a 5)
     */
    setPhase: (phase) => set({ currentPhase: phase })
}));