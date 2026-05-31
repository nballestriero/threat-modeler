/**
 * @file Middleware per la risoluzione sicura della directory di progetto
 * @module middleware/projectScope
 * 
 * @description
 * Intercetta ogni richiesta HTTP, determina la directory di lavoro corretta 
 * in base al progetto attivo o all'header X-Project-ID, e la inietta in `req.projectDir`.
 * Garantisce isolamento dei dati: ogni progetto scrive/legge solo nella propria cartella.
 * Supporta override via `process.env.DATA_DIR` per ambienti di test.
 * Previene la creazione accidentale di cartelle nidificate o percorsi non validi.
 * 
 * ## Flusso di risoluzione
 * 1. Legge `X-Project-ID` dall'header o query param (priorità massima)
 * 2. Se assente, legge il progetto attivo tramite `projectService.getActiveProjectDir()`
 * 3. Se esiste e ha formato UUID valido → garantisce esistenza cartella → inietta path
 * 4. Se non esiste → usa fallback `DATA_DIR` senza creare nuove directory
 * 5. In caso di errore critico → logga errore, usa fallback, prosegue richiesta
 * 
 * @see {@link ../services/projectService.js} Service gestione progetti
 * @see {@link ../routes/config.js} Configurazione globale
 */

const path = require('path');
const fs = require('fs').promises;
const projectService = require('../services/projectService');

// ✅ Regex per validare formato UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware Express per risolvere e iniettare `req.projectDir`.
 * @async
 * @function
 * @param {import('express').Request} req - Request object di Express
 * @param {string} [req.projectDir] - (Iniettato) Percorso directory progetto attivo o fallback
 * @param {string} [req.projectId] - (Iniettato) ID del progetto attivo
 * @param {import('express').Response} res - Response object di Express
 * @param {import('express').NextFunction} next - Callback per middleware successivo
 * @returns {Promise<void>}
 */
module.exports = async (req, res, next) => {
    try {
        // ✅ 1. Priorità: header esplicito (multi-sessione)
        const projectIdFromHeader = req.headers['x-project-id'] || req.query.projectId;

        let targetProjectId = projectIdFromHeader;

        // ✅ 2. Fallback: progetto attivo globale (solo se nessun header fornito)
        if (!targetProjectId) {
            const activeDir = await projectService.getActiveProjectDir();
            targetProjectId = activeDir ? path.basename(activeDir) : null;
        }

        // ✅ 3. Nessun progetto → usa fallback sicuro
        if (!targetProjectId) {
            // ✅ DATA_DIR letto a runtime, non a compile-time (fix BUG-004)
            const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
            req.projectDir = DATA_DIR;
            return next();
        }

        // ✅ 4. Validazione UUID (fix BUG-003: path traversal)
        if (!UUID_REGEX.test(targetProjectId)) {
            return res.status(400).json({
                error: 'ID progetto non valido. Deve essere un UUID v4.'
            });
        }

        // ✅ 5. Risoluzione sicura + anti path traversal
        // ✅ DATA_DIR letto a runtime (fix BUG-004)
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        const resolvedPath = path.resolve(DATA_DIR, targetProjectId);
        const safeBase = path.resolve(DATA_DIR);

        if (!resolvedPath.startsWith(safeBase + path.sep) && resolvedPath !== safeBase) {
            return res.status(400).json({
                error: 'Tentativo di accesso a percorso non consentito.'
            });
        }

        // ✅ 6. Garantisce esistenza cartella (solo se progetto valido)
        await fs.mkdir(resolvedPath, { recursive: true });

        req.projectDir = resolvedPath;
        req.projectId = targetProjectId; // ✅ Disponibile nei controller
        next();

    } catch (err) {
        // ✅ Gestione errore resiliente: non blocca la richiesta
        console.error('❌ [projectScope] Errore critico:', err.message);

        // ✅ DATA_DIR letto a runtime (fix BUG-004)
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        req.projectDir = DATA_DIR;
        next();
    }
};