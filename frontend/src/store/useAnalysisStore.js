/**
 * Store Zustand per la gestione dell'estrazione asset
 * @module store/useAnalysisStore
 */

import { create } from 'zustand';
import { extractAssets } from '../api/analysisApi';

export const useAnalysisStore = create((set, get) => ({
    isExtracting: false,
    extractionError: null,
    extractedAssets: [],
    extractionStats: { saved: 0, duplicates: 0, chunksProcessed: 0 },

    runExtraction: async (params) => {
        set({ isExtracting: true, extractionError: null });
        try {
            const result = await extractAssets(params);
            set({
                extractedAssets: result.assets,
                extractionStats: {
                    saved: result.saved,
                    duplicates: result.duplicates,
                    chunksProcessed: result.chunksProcessed
                },
                isExtracting: false
            });
            return result;
        } catch (err) {
            set({ extractionError: err.message, isExtracting: false });
            throw err;
        }
    },

    resetExtraction: () => {
        set({
            extractedAssets: [],
            extractionStats: { saved: 0, duplicates: 0, chunksProcessed: 0 },
            extractionError: null,
            isExtracting: false
        });
    }
}));