/**
 * @file Store Zustand per la gestione dello stato progetti
 * @module store/useProjectStore
 * 
 * @description
 * Gestisce lo stato globale dei progetti nel frontend:
 * - Lista progetti caricata dal backend
 * - Progetto attualmente attivo (con highlight UI)
 * - Stato di caricamento e gestione errori
 * - Azioni per creare, attivare, aggiornare progetti
 * 
 * ## Pattern di utilizzo
 * ```javascript
 * // In un componente React
 * const { activeProject, projects, fetchProjects, setActiveProject } = useProjectStore();
 * 
 * useEffect(() => { fetchProjects(); }, [fetchProjects]);
 * 
 * const handleActivate = (id) => setActiveProject(id);
 * ```
 * 
 * ## Integrazione con AppInitializer
 * Quando il progetto attivo cambia, viene dispatchato un evento custom
 * `projectChanged` che `AppInitializer` ascolta per ricaricare asset/flows.
 * 
 * @see {@link ../components/AppInitializer.jsx} Listener per evento projectChanged
 * @see {@link ../api/projectsApi.js} Layer API usato dalle azioni dello store
 */

import { create } from 'zustand';
import { projectsApi } from '../api/projectsApi';

/**
 * @typedef {Object} ProjectState
 * @property {Project[]} projects - Lista completa dei progetti caricati
 * @property {Project|null} activeProject - Progetto attualmente attivo o null
 * @property {boolean} loading - Flag di caricamento durante operazioni async
 * @property {string|null} error - Messaggio di errore o null se nessun errore
 */

export const useProjectStore = create((set, get) => ({
    /** @type {Project[]} */
    projects: [],
    /** @type {Project|null} */
    activeProject: null,
    /** @type {boolean} */
    loading: false,
    /** @type {string|null} */
    error: null,

    /**
     * Fetch della lista progetti dal backend.
     * Popola `projects` e `activeProject` nello store.
     * @async
     * @returns {Promise<void>}
     * @example
     * await fetchProjects();
     * console.log(get().activeProject?.name);
     */
    fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
            const list = await projectsApi.getAll();
            const active = list.find(p => p.status === 'active') || null;
            set({ projects: list, activeProject: active, loading: false });
        } catch (err) {
            console.error('Errore fetch progetti:', err);
            set({ error: err.message || 'Impossibile caricare i progetti', loading: false });
        }
    },

    /**
     * Imposta un progetto come attivo (disattivando gli altri).
     * Dispatcha evento `projectChanged` per triggerare reload dati globali.
     * @async
     * @param {string} id - ID del progetto da attivare
     * @returns {Promise<void>}
     * @example
     * await setActiveProject('uuid-123');
     * // → Triggera evento 'projectChanged' ascoltato da AppInitializer
     */
    setActiveProject: async (id) => {
        try {
            const updated = await projectsApi.setStatus(id, 'active');
            set(state => ({
                activeProject: updated,
                projects: state.projects.map(p =>
                    p.id === id
                        ? { ...p, status: 'active' }
                        : p.status === 'active'
                            ? { ...p, status: 'draft' }
                            : p
                )
            }));
            // Notifica il cambio progetto per triggerare reload dati globali
            window.dispatchEvent(new CustomEvent('projectChanged', { detail: id }));
        } catch (err) {
            console.error('Errore attivazione progetto:', err);
            set({ error: err.message || 'Impossibile attivare il progetto' });
        }
    },

    /**
     * Crea un nuovo progetto. Il backend lo imposta automaticamente come attivo.
     * @async
     * @param {Object} data - Dati per la creazione (name, description, owner)
     * @returns {Promise<Project>} Il progetto creato
     * @example
     * const project = await addProject({ name: 'Nuovo Progetto', owner: 'Me' });
     * console.log(project.status); // → 'active'
     */
    addProject: async (data) => {
        try {
            const newProject = await projectsApi.create(data);
            set(state => ({
                projects: [...state.projects, newProject],
                activeProject: newProject // Auto-attivato dal backend
            }));
            // Notifica il cambio progetto per triggerare reload dati
            window.dispatchEvent(new CustomEvent('projectChanged', { detail: newProject.id }));
            return newProject;
        } catch (err) {
            console.error('Errore creazione progetto:', err);
            set({ error: err.message || 'Impossibile creare il progetto' });
            throw err; // Rilancia per gestione UI (es. alert)
        }
    },

    /**
     * Aggiorna i metadati di un progetto esistente.
     * @async
     * @param {string} id - ID del progetto da aggiornare
     * @param {Object} updates - Campi da aggiornare (name, description, owner)
     * @returns {Promise<void>}
     */
    updateProject: async (id, updates) => {
        try {
            const updated = await projectsApi.update(id, updates);
            set(state => ({
                projects: state.projects.map(p => p.id === id ? updated : p),
                activeProject: state.activeProject?.id === id ? updated : state.activeProject
            }));
        } catch (err) {
            console.error('Errore aggiornamento progetto:', err);
            set({ error: err.message || 'Impossibile aggiornare il progetto' });
        }
    },

    /**
     * Resetta completamente lo stato dello store.
     * Utile per logout, cambio utente o reload forzato.
     */
    reset: () => {
        set({ projects: [], activeProject: null, loading: false, error: null });
    }
}));