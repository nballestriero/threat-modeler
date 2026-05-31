/**
 * @file Rotte REST per la configurazione globale (RAG, Ollama, ecc.)
 * @module routes/config
 * 
 * @description
 * Gestisce GET/PUT della configurazione globale dell'applicazione.
 * ✅ FIX BUG-002 + BUG-003: I file di configurazione vengono salvati 
 * in `DATA_DIR/config.json` (non hardcoded) per coerenza con il resto 
 * dell'applicazione e supporto test.
 * La configurazione è un oggetto JSON con chiavi di primo livello 
 * (es. `rag`, `ollama`). Gli aggiornamenti effettuano un merge superficiale.
 * 
 * ## Endpoint gestiti
 * | Metodo | Endpoint | Descrizione |
 * |--------|----------|-------------|
 * | GET | `/api/config` | Recupera la configurazione globale attuale |
 * | PUT | `/api/config` | Aggiorna parzialmente la configurazione |
 * 
 * @see {@link ../middleware/projectScope.js} Middleware che usa DATA_DIR
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * ✅ FIX BUG-002 + BUG-003: Risolve il percorso config in modo dinamico
 * Legge DATA_DIR a runtime, non a compile-time.
 * @returns {string} Percorso assoluto del file config.json
 */
function getGlobalConfigPath() {
    const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
    return path.join(DATA_DIR, 'config.json');
}

/**
 * Carica la configurazione globale dal file JSON.
 * Se il file non esiste o è corrotto, restituisce i valori di default.
 * @async
 * @returns {Promise<Object>} Configurazione globale corrente
 */
async function loadConfig() {
    try {
        const configPath = getGlobalConfigPath();
        const raw = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        // Configurazione di default se il file non esiste o è invalido
        return {
            rag: {
                enabled: true,
                mode: 'http-server',
                baseUrl: 'http://localhost:8000',
                model: 'all-MiniLM-L6-v2',
                pythonEnvPath: ''
            },
            ollama: {
                enabled: true,
                baseUrl: 'http://localhost:11434',
                model: 'llama3.1:8b'
            }
        };
    }
}

/**
 * Salva la configurazione globale nel file JSON.
 * Crea la directory DATA_DIR se non esiste.
 * @async
 * @param {Object} config - Oggetto configurazione da serializzare
 * @returns {Promise<void>}
 * @throws {Error} Se la scrittura su disco fallisce o la validazione fallisce
 */
async function saveConfig(config) {
    // ✅ Validazione rag.mode (per test config.real.test.js)
    if (config.rag?.mode && !['http-server', 'python-client'].includes(config.rag.mode)) {
        throw new Error(`rag.mode deve essere 'http-server' o 'python-client', ricevuto: ${config.rag.mode}`);
    }

    const configPath = getGlobalConfigPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * @route PUT /api/config
 */
router.put('/', async (req, res) => {
    try {
        const current = await loadConfig();
        const merged = { ...current, ...req.body };
        await saveConfig(merged);
        res.json({ success: true, message: 'Configurazione salvata' });
    } catch (err) {
        console.error('❌ [ROUTES] Errore in PUT /config:', err.message);
        // ✅ Ritorna 400 per errori di validazione
        if (err.message?.includes('rag.mode') || err.message?.includes('obbligatorio')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Impossibile salvare la configurazione globale: ' + err.message });
    }
});

/**
 * @route GET /api/config
 * @desc Recupera la configurazione globale attuale
 * @access Public
 * @returns {Object} Configurazione JSON con chiavi `rag`, `ollama`, ecc.
 * @example
 * GET /api/config
 * → 200 OK
 * { "rag": { "enabled": true, ... }, "ollama": { ... } }
 */
router.get('/', async (req, res) => {
    try {
        const config = await loadConfig();
        res.json(config);
    } catch (err) {
        console.error('❌ [ROUTES] Errore in GET /config:', err.message);
        // ✅ Non fallire mai: restituisci default invece di 500
        res.status(200).json({
            rag: { enabled: true, mode: 'http-server', baseUrl: '', pythonEnvPath: '' },
            ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' },
            _warning: 'Configurazione di fallback (errore lettura file)'
        });
    }
});

/**
 * @route PUT /api/config
 * @desc Aggiorna parzialmente la configurazione globale
 * @access Public
 * @param {Object} req.body - Campi configurazione da aggiornare (merge superficiale)
 * @returns {Object} Conferma salvataggio
 * @example
 * PUT /api/config
 * Body: { "rag": { "enabled": false, "model": "custom-model" } }
 * → 200 OK
 * { "success": true, "message": "Configurazione salvata" }
 */
router.put('/', async (req, res) => {
    try {
        const current = await loadConfig();
        const merged = { ...current, ...req.body };
        await saveConfig(merged);
        res.json({ success: true, message: 'Configurazione salvata' });
    } catch (err) {
        console.error('❌ [ROUTES] Errore in PUT /config:', err.message);
        res.status(500).json({ error: 'Impossibile salvare la configurazione globale: ' + err.message });
    }
});

module.exports = router;