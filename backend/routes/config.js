/**
 * @file Rotte REST per la configurazione globale (RAG, Ollama, ecc.)
 * @module routes/config
 * 
 * @description
 * Gestisce GET/PUT della configurazione globale dell'applicazione.
 * I file di configurazione vengono salvati in `backend/data/config.json` 
 * per evitare scritture accidentali nella root del progetto.
 * La configurazione è un oggetto JSON con chiavi di primo livello (es. `rag`, `ollama`).
 * Gli aggiornamenti effettuano un merge superficiale, preservando i campi non forniti.
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

// ✅ Percorso sicuro per la config globale (MAI nella root backend/)
const GLOBAL_CONFIG_PATH = path.join(__dirname, '../data/config.json');

/**
 * Carica la configurazione globale dal file JSON.
 * Se il file non esiste o è corrotto, restituisce i valori di default.
 * @async
 * @returns {Promise<Object>} Configurazione globale corrente
 */
async function loadConfig() {
    try {
        const raw = await fs.readFile(GLOBAL_CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        // Configurazione di default se il file non esiste o è invalido
        return {
            rag: {
                enabled: true,
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
 * Crea la directory `data/` se non esiste.
 * @async
 * @param {Object} config - Oggetto configurazione da serializzare
 * @returns {Promise<void>}
 * @throws {Error} Se la scrittura su disco fallisce
 */
async function saveConfig(config) {
    await fs.mkdir(path.dirname(GLOBAL_CONFIG_PATH), { recursive: true });
    await fs.writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

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
        res.status(500).json({ error: 'Impossibile leggere la configurazione globale' });
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
        res.status(500).json({ error: 'Impossibile salvare la configurazione globale' });
    }
});

module.exports = router;