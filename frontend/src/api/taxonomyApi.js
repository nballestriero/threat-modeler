/**
 * @file Layer API per la gestione delle tassonomie (metodologie DFD, STRIDE, PASTA, ecc.)
 * @description Centralizza le chiamate HTTP per recuperare tassonomie e categorie di colore/forma utilizzate nel DFD e nelle metodologie di threat modeling.
 * @module api/taxonomyApi
 * 
 * @see {@link ../config/api.js} Istanza axios preconfigurata con VITE_API_BASE
 */

import { apiClient } from '../config/api';

/**
 * @typedef {Object} TaxonomyCategory
 * @property {string} name - Nome della categoria (es. 'External Entity', 'Process', 'Data Store')
 * @property {string} color - Colore principale per bordi/testo (es. '#1E40AF')
 * @property {string} colorBg - Colore di sfondo per badge/UI (es. '#DBEAFE')
 * @property {string} [shape] - Forma opzionale per il rendering Mermaid/DFD
 */

/**
 * @typedef {Object} TaxonomyResponse
 * @property {TaxonomyCategory[]} categories - Lista delle categorie della metodologia
 * @property {string} [methodologyId] - Identificativo della metodologia di riferimento
 * @property {string} [version] - Versione della tassonomia
 */

/**
 * Oggetto che espone i metodi per il recupero delle tassonomie.
 */
export const taxonomyApi = {

    /**
     * Recupera la tassonomia DFD base utilizzata per la classificazione degli asset nella Fase 2.
     * Restituisce le categorie standard con i relativi colori per il rendering UI e DFD.
     * @async
     * @returns {Promise<TaxonomyResponse>} Oggetto contenente l'array `categories`
     * @throws {Error} Se l'endpoint non è raggiungibile o la risposta non è valida
     * @example
     * const taxonomy = await taxonomyApi.getDfdTaxonomy();
     * console.log(taxonomy.categories); 
     * // → [{ name: 'Process', color: '#B45309', colorBg: '#FEF3C7' }, ...]
     */
    getDfdTaxonomy: async () => {
        const response = await apiClient.get('/dfd-taxonomy');
        return response.data;
    },

    /**
     * Recupera la tassonomia specifica di una metodologia di threat modeling.
     * Utilizzato in Fase 4 per generare e classificare asset specifici per STRIDE, PASTA, LINDDUN, FMEA, ecc.
     * @async
     * @param {string} methodologyId - Identificativo della metodologia (es. 'stride', 'pasta', 'linddun')
     * @returns {Promise<TaxonomyResponse>} Tassonomia della metodologia richiesta
     * @throws {Error} Se `methodologyId` è vuoto o se l'endpoint restituisce 404
     * @example
     * const strideTax = await taxonomyApi.getTaxonomy('stride');
     * // strideTax.categories → [{ name: 'Spoofing', color: '#...', colorBg: '#...' }, ...]
     */
    getTaxonomy: async (methodologyId) => {
        if (!methodologyId || typeof methodologyId !== 'string') {
            throw new Error('methodologyId è obbligatorio e deve essere una stringa non vuota');
        }
        const response = await apiClient.get(`/methodologies/${methodologyId}/taxonomy`);
        return response.data;
    }
};

export default taxonomyApi;