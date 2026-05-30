/**
 * API per la gestione degli asset (CRUD, import)
 * @module api/assetsApi
 */

import { apiClient } from '../config/api';

export const assetsApi = {
    getAll: () => apiClient.get('/assets').then(r => r.data),
    create: (assetData) => apiClient.post('/assets', assetData).then(r => r.data),
    update: (id, updates) => apiClient.put(`/assets/${id}`, updates).then(r => r.data),
    delete: (id) => apiClient.delete(`/assets/${id}`).then(r => r.data),
    import: (assets) => apiClient.post('/assets/import', { assets }).then(r => r.data)
};