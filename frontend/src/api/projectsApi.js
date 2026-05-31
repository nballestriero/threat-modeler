/**
 * @file Layer API centralizzato per la gestione progetti
 * @module api/projectsApi
 * 
 * @description
 * Centralizza tutte le chiamate HTTP relative alla gestione progetti,
 * utilizzando l'istanza axios preconfigurata `apiClient` per:
 * - Gestione automatica di baseURL, timeout e interceptor errori
 * - Coerenza con gli altri layer API (assetsApi, configApi, ecc.)
 * - Facilità di testing e mocking
 * 
 * ## Endpoint gestiti
 * | Metodo | Endpoint | Descrizione |
 * |--------|----------|-------------|
 * | GET | `/api/projects` | Recupera lista progetti |
 * | POST | `/api/projects` | Crea nuovo progetto (auto-attivato) |
 * | PUT | `/api/projects/:id` | Aggiorna metadati progetto |
 * | POST | `/api/projects/:id/status` | Cambia stato progetto (draft/active/archived) |
 * 
 * @see {@link ../config/api.js} Configurazione axios con VITE_API_BASE
 */

import { apiClient } from '../config/api';

/**
 * @typedef {Object} Project
 * @property {string} id - Identificativo univoco UUID v4
 * @property {string} name - Nome del progetto (obbligatorio)
 * @property {string} [description] - Descrizione opzionale
 * @property {string} [owner] - Proprietario opzionale
 * @property {'draft'|'active'|'archived'} status - Stato del progetto
 * @property {string} createdAt - Timestamp ISO di creazione
 * @property {string} updatedAt - Timestamp ISO di ultimo aggiornamento
 */

export const projectsApi = {
    /**
     * Recupera la lista di tutti i progetti dall'API backend.
     * @async
     * @returns {Promise<Project[]>} Array di progetti ordinati per updatedAt decrescente
     * @throws {Error} Se la chiamata API fallisce o la risposta non è valida
     * @example
     * const projects = await projectsApi.getAll();
     * const active = projects.find(p => p.status === 'active');
     */
    getAll: async () => {
        const response = await apiClient.get('/projects');
        return response.data;
    },

    /**
     * Crea un nuovo progetto. Il backend lo imposta automaticamente come attivo.
     * @async
     * @param {Object} data - Dati per la creazione
     * @param {string} data.name - Nome del progetto (obbligatorio, minimo 1 carattere)
     * @param {string} [data.description] - Descrizione opzionale
     * @param {string} [data.owner] - Proprietario opzionale
     * @returns {Promise<Project>} Il progetto creato con ID generato e status 'active'
     * @throws {Error} Se la validazione fallisce o la chiamata API restituisce errore
     * @example
     * const project = await projectsApi.create({
     *   name: 'Analisi Sistema Bancario',
     *   description: 'Threat modeling per app mobile',
     *   owner: 'Security Team'
     * });
     * console.log(project.status); // → 'active'
     */
    create: async (data) => {
        const response = await apiClient.post('/projects', data);
        return response.data;
    },

    /**
     * Aggiorna i metadati di un progetto esistente.
     * Non permette la modifica di `id` o `status` (usare setStatus per quello).
     * @async
     * @param {string} id - ID univoco del progetto da aggiornare
     * @param {Object} updates - Campi da aggiornare (name, description, owner)
     * @returns {Promise<Project>} Il progetto aggiornato con updatedAt refreshato
     * @throws {Error} Se il progetto non esiste o la validazione fallisce
     * @example
     * const updated = await projectsApi.update('uuid-123', {
     *   name: 'Nome Aggiornato',
     *   description: 'Nuova descrizione'
     * });
     */
    update: async (id, updates) => {
        const response = await apiClient.put(`/projects/${id}`, updates);
        return response.data;
    },

    /**
     * Cambia lo stato di un progetto (draft → active → archived).
     * Se si imposta `active`, il backend disattiva automaticamente gli altri progetti.
     * @async
     * @param {string} id - ID univoco del progetto
     * @param {'draft'|'active'|'archived'} status - Nuovo stato da assegnare
     * @returns {Promise<Project>} Il progetto aggiornato con il nuovo stato
     * @throws {Error} Se lo stato non è valido o il progetto non esiste
     * @example
     * // Archivia un progetto
     * await projectsApi.setStatus('uuid-123', 'archived');
     * 
     * // Attiva un progetto (disattiva gli altri automaticamente)
     * await projectsApi.setStatus('uuid-456', 'active');
     */
    setStatus: async (id, status) => {
        const response = await apiClient.post(`/projects/${id}/status`, { status });
        return response.data;
    }
};

export default projectsApi;