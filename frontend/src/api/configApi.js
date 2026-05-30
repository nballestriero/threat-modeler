/**
 * API per la configurazione dell'applicazione
 * @module api/configApi
 */

import { apiClient } from '../config/api';

export const configApi = {
    /**
     * Recupera la configurazione corrente
     * @returns {Promise<Object>} Configurazione
     */
    get: () => apiClient.get('/config').then(r => r.data),

    /**
     * Aggiorna la configurazione (merge profondo)
     * @param {Object} updates - Campi da aggiornare
     * @returns {Promise<Object>} Risultato dell'operazione
     */
    update: (updates) => apiClient.put('/config', updates).then(r => r.data)
};