import { create } from 'zustand';

export const useAppStore = create((set) => ({
    currentPhase: 1,
    setCurrentPhase: (phase) => set({ currentPhase: phase }),
}));