/**
 * @file Middleware per la risoluzione della directory del progetto attivo
 * @module middleware/projectScope
 * 
 * @description
 * Risolve la directory dati del progetto attivo e la inietta in `req.projectDir`.
 * Se nessun progetto è attivo, utilizza una directory di fallback sicura per evitare errori null.
 * Supporta `process.env.DATA_DIR` per isolamento nei test.
 * 
 * ## Flusso di risoluzione
 * 1. Cerca un progetto con `status: 'active'` in `projects.json`
 * 2. Se trovato, imposta `req.projectDir = backend/data/<project-uuid>/`
 * 3. Se non trovato, fallback su `process.env.DATA_DIR` o `backend/data/`
 * 4. Assicura che la directory esista fisicamente (crea se manca)
 * 
 * @see {@link ../services/projectService.js} Service per gestione progetti
 * @see {@link ../models/assetModel.js} Modello dati che usa req.projectDir
 */

const path = require('path');
const fs = require('fs').promises;

// ✅ Usa path assoluto per evitare problemi di risoluzione modulo
const projectService = require(path.join(__dirname, '../services/projectService'));

// ✅ Rispetta DATA_DIR da env var (per test), altrimenti fallback su path relativo a questo file
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

/**
 * Middleware Express per risolvere la directory del progetto attivo.
 * @async
 * @function
 * @param {Object} req - Request object di Express
 * @param {string} [req.projectDir] - (Iniettato) Percorso della directory del progetto attivo, o fallback
 * @param {Object} res - Response object di Express
 * @param {Function} next - Callback per passare al middleware successivo
 * @returns {Promise<void>}
 * 
 * @example
 * // In server.js
 * const projectScope = require('./middleware/projectScope');
 * app.use(express.json());
 * app.use(projectScope); // ← Eseguito prima di ogni route
 * 
 * // In un controller
 * const assets = await assetService.getAllAssets(req.projectDir);
 */
module.exports = async (req, res, next) => {
    try {
        // 1. Cerca il progetto attivo tramite service
        let projectDir = await projectService.getActiveProjectDir();

        // 2. Fallback sicuro: se non c'è progetto attivo, usa DATA_DIR
        if (!projectDir) {
            console.warn('⚠️ Nessun progetto attivo. Utilizzo directory fallback:', DATA_DIR);
            projectDir = DATA_DIR;
        }

        // 3. Assicura che la directory esista fisicamente (crea se manca)
        await fs.mkdir(projectDir, { recursive: true });

        // 4. Inietta il path risolto nella request per l'uso nei service
        req.projectDir = projectDir;

        // 5. Prosegui con la catena di middleware
        next();

    } catch (err) {
        // Log dell'errore per debugging, ma non bloccare la richiesta
        console.error('❌ Errore critico nel middleware projectScope:', err.message);

        // Fallback estremo: usa DATA_DIR per non bloccare l'app
        req.projectDir = DATA_DIR;
        next();
    }
};