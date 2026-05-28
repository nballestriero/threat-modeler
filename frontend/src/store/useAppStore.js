import { create } from 'zustand';

export const useAppStore = create((set) => ({
    currentPhase: 1,
    activeMethodology: null,
    setCurrentPhase: (phase) => set({ currentPhase: phase }),
    setActiveMethodology: (method) => set({ activeMethodology: method }),
}));