/**
 * API per la gestione delle tassonomie (metodologie DFD, STRIDE, ecc.)
 * @module api/taxonomyApi
 */

import { apiClient } from '../config/api';

export const taxonomyApi = {
    /**
     * Recupera la tassonomia DFD base (categorie, colori, forme)
     * @returns {Promise<Object>} Oggetto con la proprietà `categories`
     * @example
     * const { categories } = await taxonomyApi.getDfdTaxonomy();
     */
    getDfdTaxonomy: () => apiClient.get('/dfd-taxonomy').then(r => r.data),

    /**
     * Recupera la tassonomia di una metodologia specifica
     * @param {string} methodologyId - ID della metodologia (es. 'stride-ai')
     * @returns {Promise<Object>} Tassonomia della metodologia
     */
    getTaxonomy: (methodologyId) => apiClient.get(`/methodologies/${methodologyId}/taxonomy`).then(r => r.data)
};