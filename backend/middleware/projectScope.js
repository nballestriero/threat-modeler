/**
 * @file Middleware Express per la risoluzione della directory del progetto attivo
 * @module middleware/projectScope
 * 
 * @description
 * Intercetta ogni richiesta HTTP, determina la directory di lavoro corretta 
 * in base al progetto attivo e la inietta in `req.projectDir`.
 * Garantisce isolamento dei dati: ogni progetto scrive/legge solo nella propria cartella.
 * Supporta override via `process.env.DATA_DIR` per ambienti di test.
 * Previene la creazione accidentale di cartelle nidificate o percorsi non validi.
 * 
 * ## Flusso di risoluzione
 * 1. Legge il progetto attivo tramite `projectService.getActiveProjectDir()`
 * 2. Se esiste e ha formato UUID valido → garantisce esistenza cartella → inietta path
 * 3. Se non esiste → usa fallback `DATA_DIR` senza creare nuove directory
 * 4. In caso di errore critico → logga errore, usa fallback, prosegue richiesta
 * 
 * @see {@link ../services/projectService.js} Service gestione progetti
 * @see {@link ../routes/config.js} Configurazione globale
 */

const path = require('path');
const fs = require('fs').promises;
const projectService = require('../services/projectService');

// ✅ Usa DATA_DIR da env var se impostata (per test), altrimenti fallback sicuro
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Regex per validare formato UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware Express per risolvere e iniettare `req.projectDir`.
 * @async
 * @function
 * @param {import('express').Request} req - Request object di Express
 * @param {string} [req.projectDir] - (Iniettato) Percorso directory progetto attivo o fallback
 * @param {import('express').Response} res - Response object di Express
 * @param {import('express').NextFunction} next - Callback per middleware successivo
 * @returns {Promise<void>}
 */
module.exports = async (req, res, next) => {
    try {
        let projectDir = await projectService.getActiveProjectDir();

        // ✅ Fallback sicuro: NON crea cartelle a cascata se nessun progetto è attivo
        if (!projectDir) {
            req.projectDir = DATA_DIR;
            return next();
        }

        // ✅ Verifica che il nome della directory sia un UUID valido
        const dirName = path.basename(projectDir);
        if (UUID_REGEX.test(dirName)) {
            // Crea la directory SOLO se è una cartella di progetto legittima
            await fs.mkdir(projectDir, { recursive: true });
        } else {
            // Se il path non è un UUID, usa il fallback sicuro
            console.warn(`⚠️ [projectScope] Percorso non valido rilevato: ${projectDir}. Fallback su DATA_DIR.`);
            projectDir = DATA_DIR;
        }

        req.projectDir = projectDir;
        next();
    } catch (err) {
        // ✅ Gestione errore resiliente: non blocca la richiesta
        console.error('❌ [projectScope] Errore critico nella risoluzione directory:', err.message);
        req.projectDir = DATA_DIR;
        next();
    }
};