/**
 * @file Servizio per la gestione dei progetti (CRUD, stati, attivazione)
 * @module services/projectService
 * 
 * @description
 * Gestisce il ciclo di vita dei progetti nell'applicazione threat-modeler:
 * - Creazione con attivazione automatica e inizializzazione directory isolata
 * - Lettura/Scrittura della lista progetti da `projects.json`
 * - Gestione stati: `draft`, `active`, `archived`
 * - Isolamento dati: ogni progetto ha la sua cartella con `threat-model.json`, `config.json`
 * 
 * ## Struttura dati progetto
 * ```json
 * {
 *   "id": "uuid-v4",
 *   "name": "Nome Progetto",
 *   "description": "Descrizione opzionale",
 *   "owner": "Proprietario opzionale",
 *   "status": "active|draft|archived",
 *   "createdAt": "ISO-8601 timestamp",
 *   "updatedAt": "ISO-8601 timestamp"
 * }
 * ```
 * 
 * ## Isolamento dati per progetto
 * Quando un progetto viene creato, viene generata una directory dedicata:
 * ```
 * backend/data/
 * ├── projects.json                    # Lista metadata progetti
 * └── <project-uuid>/                 # Directory isolata del progetto
 *     ├── threat-model.json           # Asset e flussi del progetto
 *     └── config.json                 # Configurazione specifica del progetto
 * ```
 * 
 * @see {@link ../middleware/projectScope.js} Middleware che usa questo service
 * @see {@link ../models/assetModel.js} Modello dati che supporta percorsi dinamici
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * ✅ DATA_DIR dinamico: legge process.env.DATA_DIR a runtime, non a compile-time.
 * Questo permette ai test di sovrascrivere il percorso senza riavviare il modulo.
 * @private
 * @returns {string} Percorso della directory dati
 */
function getDataDir() {
    return process.env.DATA_DIR || path.join(__dirname, '../data');
}

/**
 * Percorso del file JSON che contiene la lista dei progetti.
 * @private
 * @returns {string} Percorso completo di projects.json
 */
function getProjectsFile() {
    return path.join(getDataDir(), 'projects.json');
}

/**
 * Assicura che la directory principale dei dati esista.
 * Crea ricorsivamente se manca.
 * @async
 * @private
 * @returns {Promise<void>}
 */
async function ensureDataDir() {
    await fs.mkdir(getDataDir(), { recursive: true });
}

/**
 * Carica la lista progetti dal file JSON.
 * Restituisce array vuoto se il file non esiste o è corrotto.
 * @async
 * @private
 * @returns {Promise<Array<Object>>} Lista di progetti
 */
async function loadProjects() {
    try {
        const data = await fs.readFile(getProjectsFile(), 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // File non esiste o JSON corrotto → restituisci stato vuoto
        if (err.code === 'ENOENT') return [];
        console.error('Errore lettura projects.json:', err.message);
        return [];
    }
}

/**
 * Salva la lista progetti nel file JSON.
 * Crea la directory se manca.
 * @async
 * @private
 * @param {Array<Object>} projects - Lista di progetti da salvare
 * @returns {Promise<void>}
 */
async function saveProjects(projects) {
    await ensureDataDir();
    await fs.writeFile(getProjectsFile(), JSON.stringify(projects, null, 2));
}

/**
 * Crea la directory isolata per un progetto e inizializza i file base.
 * @async
 * @private
 * @param {string} projectId - ID univoco del progetto
 * @returns {Promise<void>}
 */
async function ensureProjectDir(projectId) {
    const projectDir = path.join(getDataDir(), projectId);

    // Crea la directory del progetto (e parent se manca)
    await fs.mkdir(projectDir, { recursive: true });

    // Inizializza threat-model.json se non esiste
    const tmFile = path.join(projectDir, 'threat-model.json');
    const tmExists = await fs.access(tmFile).then(() => true).catch(() => false);
    if (!tmExists) {
        await fs.writeFile(tmFile, JSON.stringify({ assets: [], flows: [] }, null, 2));
    }

    // Inizializza config.json se non esiste
    const cfgFile = path.join(projectDir, 'config.json');
    const cfgExists = await fs.access(cfgFile).then(() => true).catch(() => false);
    if (!cfgExists) {
        await fs.writeFile(cfgFile, JSON.stringify({}, null, 2));
    }
}

module.exports = {
    /**
     * Recupera la lista completa di tutti i progetti.
     * @async
     * @returns {Promise<Array<Object>>} Lista di progetti con tutti i metadati
     * @example
     * const projects = await projectService.getAllProjects();
     * console.log(projects.map(p => p.name));
     */
    getAllProjects: async () => await loadProjects(),

    /**
     * Crea un nuovo progetto e lo imposta AUTOMATICAMENTE come attivo.
     * Disattiva eventuali progetti attivi preesistenti (un solo progetto attivo alla volta).
     * 
     * @async
     * @param {Object} data - Dati per la creazione del progetto
     * @param {string} data.name - Nome del progetto (obbligatorio, viene trimmato)
     * @param {string} [data.description] - Descrizione opzionale
     * @param {string} [data.owner] - Proprietario opzionale
     * @returns {Promise<Object>} Il progetto creato con ID generato e timestamp
     * @throws {Error} Se la scrittura del file fallisce
     * 
     * @example
     * const project = await projectService.createProject({
     *   name: 'Analisi Sistema Bancario',
     *   description: 'Threat modeling per l'app mobile',
     *   owner: 'Security Team'
     * });
     * console.log(project.id); // → 'a1b2c3d4-...'
     * console.log(project.status); // → 'active' (auto-attivato)
     */
    createProject: async (data) => {
        const projects = await loadProjects();
        const id = uuidv4();

        // ✅ Disattiva eventuali progetti attivi prima di crearne uno nuovo
        // (garantisce un solo progetto attivo alla volta)
        projects.forEach(p => { if (p.status === 'active') p.status = 'draft'; });

        const newProject = {
            id,
            name: data.name?.trim() || 'Nuovo Progetto',
            description: data.description?.trim() || '',
            owner: data.owner?.trim() || '',
            status: 'active', // ✅ Auto-attivazione alla creazione
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        projects.push(newProject);
        await saveProjects(projects);
        await ensureProjectDir(id); // Crea cartella isolata con file base
        return newProject;
    },

    /**
     * Aggiorna i metadati di un progetto esistente.
     * Non permette la modifica diretta di `id` o `status` (usare setStatus per quello).
     * 
     * @async
     * @param {string} id - ID univoco del progetto da aggiornare
     * @param {Object} updates - Campi da aggiornare (name, description, owner)
     * @returns {Promise<Object>} Il progetto aggiornato con timestamp aggiornato
     * @throws {Error} Se il progetto non viene trovato
     * 
     * @example
     * const updated = await projectService.updateProject('uuid-123', {
     *   name: 'Nome Aggiornato',
     *   description: 'Nuova descrizione'
     * });
     */
    updateProject: async (id, updates) => {
        const projects = await loadProjects();
        const idx = projects.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Progetto non trovato: ${id}`);

        // Estrai solo i campi aggiornabili (escludi id e status)
        const { id: _, status, ...safeUpdates } = updates;

        projects[idx] = {
            ...projects[idx],
            ...safeUpdates,
            updatedAt: new Date().toISOString()
        };
        await saveProjects(projects);
        return projects[idx];
    },

    /**
     * Cambia lo stato di un progetto (draft → active → archived).
     * Se si imposta `active`, disattiva automaticamente gli altri progetti.
     * 
     * @async
     * @param {string} id - ID univoco del progetto
     * @param {'draft'|'active'|'archived'} newStatus - Nuovo stato da assegnare
     * @returns {Promise<Object>} Il progetto aggiornato con il nuovo stato
     * @throws {Error} Se lo stato non è valido o il progetto non esiste
     * 
     * @example
     * // Archivia un progetto
     * await projectService.setStatus('uuid-123', 'archived');
     * 
     * // Attiva un progetto (disattiva gli altri automaticamente)
     * await projectService.setStatus('uuid-456', 'active');
     */
    setStatus: async (id, newStatus) => {
        const validStatus = ['draft', 'active', 'archived'];
        if (!validStatus.includes(newStatus)) {
            throw new Error(`Stato non valido: ${newStatus}. Valori ammessi: ${validStatus.join(', ')}`);
        }

        const projects = await loadProjects();
        const target = projects.find(p => p.id === id);
        if (!target) throw new Error(`Progetto non trovato: ${id}`);

        // Se si attiva un progetto, disattiva tutti gli altri (un solo attivo)
        if (newStatus === 'active') {
            projects.forEach(p => {
                if (p.status === 'active' && p.id !== id) p.status = 'draft';
            });
        }

        target.status = newStatus;
        target.updatedAt = new Date().toISOString();
        await saveProjects(projects);
        return target;
    },

    /**
     * Recupera il percorso della directory del progetto attualmente attivo.
     * @async
     * @returns {Promise<string|null>} Percorso completo o null se nessun progetto attivo
     * @example
     * const dir = await projectService.getActiveProjectDir();
     * if (dir) {
     *   const assets = await fs.readFile(path.join(dir, 'threat-model.json'));
     * }
     */
    getActiveProjectDir: async () => {
        const projects = await loadProjects();
        const active = projects.find(p => p.status === 'active');
        return active ? path.join(getDataDir(), active.id) : null;
    },

    /**
     * Recupera il percorso della directory di un progetto specifico per ID.
     * Utile per operazioni amministrative o migrazioni.
     * @async
     * @param {string} projectId - ID del progetto
     * @returns {Promise<string|null>} Percorso completo o null se il progetto non esiste
     */
    getProjectDir: async (projectId) => {
        const projects = await loadProjects();
        const project = projects.find(p => p.id === projectId);
        return project ? path.join(getDataDir(), projectId) : null;
    }
};