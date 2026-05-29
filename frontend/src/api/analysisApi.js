/**
 * API per l'estrazione di asset via pipeline LLM
 * @module api/analysisApi
 */

import { apiClient } from '../config/api';

/**
 * Estrae asset da uno o più file (PDF, MD, TXT, HTML) utilizzando la pipeline LLM.
 * @param {Object} params - Parametri della richiesta
 * @param {string[]} params.files - Percorsi assoluti dei file da analizzare
 * @param {string[]} [params.contextFiles] - File di contesto (opzionali)
 * @param {string} params.methodology - Metodologia da usare (es. 'dfd-base')
 * @param {Object} [params.options] - Opzioni di estrazione
 * @param {boolean} [params.options.useChunking=true] - Abilita chunking
 * @param {number} [params.options.maxChunkSize=1500] - Dimensione massima chunk
 * @param {number} [params.options.chunkOverlap=150] - Overlap tra chunk
 * @param {boolean} [params.options.useRag=false] - Abilita RAG
 * @returns {Promise<Object>} Oggetto con success, assets, count, saved, duplicates, ecc.
 */
export const extractAssets = async ({ files, contextFiles = [], methodology, options = {} }) => {
    const response = await apiClient.post('/analyze/extract-assets', {
        files,
        contextFiles,
        methodology,
        options: {
            useChunking: options.useChunking !== false,
            maxChunkSize: options.maxChunkSize || 1500,
            chunkOverlap: options.chunkOverlap || 150,
            useRag: options.useRag || false
        }
    });
    return response.data;
};