/**
 * @file Modello per la gestione del file threat-model.json
 * @module models/assetModel
 * 
 * @description
 * Gestisce la lettura e scrittura del modello dati principale (asset + flussi)
 * con supporto per percorsi dinamici. Permette l'isolamento dei dati per progetto
 * accettando un `projectDir` opzionale.
 * 
 * ## Supporto multi-progetto
 * Quando viene passato `projectDir`, il modello opera nella directory isolata
 * del progetto specifico:
 * ```
 * backend/data/<project-uuid>/threat-model.json
 * ```
 * Se `projectDir` è `null` o `undefined`, usa la directory di fallback:
 * ```
 * backend/data/threat-model.json
 * ```
 * 
 * ## Struttura del modello
 * ```json
 * {
 *   "assets": [
 *     { "id": "uuid", "name": "Asset Name", "category": "Process", ... }
 *   ],
 *   "flows": [
 *     { "id": "uuid", "fromId": "asset-id", "toId": "asset-id", "label": "Flow Label" }
 *   ]
 * }
 * ```
 * 
 * @see {@link ../services/projectService.js} Servizio che gestisce le directory progetto
 * @see {@link ../middleware/projectScope.js} Middleware che inietta req.projectDir
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Directory di fallback per i dati quando nessun progetto è attivo.
 * @private
 * @constant {string}
 */
const DEFAULT_DATA_DIR = path.join(__dirname, '../data');

/**
 * Nome del file JSON principale che contiene asset e flussi.
 * @private
 * @constant {string}
 */
const MODEL_FILENAME = 'threat-model.json';

/**
 * Carica il modello completo (assets + flows) dalla directory specificata.
 * Se il file non esiste o è corrotto, restituisce una struttura vuota sicura.
 * 
 * @async
 * @param {string} [projectDir] - Percorso della directory del progetto attivo (da req.projectDir)
 * @returns {Promise<{assets: Array<Object>, flows: Array<Object>}>} Modello dati con asset e flussi
 * @throws {Error} Solo in caso di errori di sistema gravi (permessi, disco pieno, ecc.)
 * 
 * @example
 * // Carica dal progetto attivo
 * const model = await loadModel(req.projectDir);
 * 
 * // Carica dalla directory di fallback
 * const model = await loadModel();
 * 
 * console.log(model.assets.length); // → Numero di asset caricati
 */
async function loadModel(projectDir) {
    const dir = projectDir || DEFAULT_DATA_DIR;
    const filePath = path.join(dir, MODEL_FILENAME);

    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);

        // Validazione base della struttura
        return {
            assets: Array.isArray(parsed.assets) ? parsed.assets : [],
            flows: Array.isArray(parsed.flows) ? parsed.flows : []
        };
    } catch (err) {
        // File non esiste, JSON corrotto o errore di lettura → restituisci struttura vuota
        if (err.code === 'ENOENT' || err.name === 'SyntaxError') {
            return { assets: [], flows: [] };
        }
        // Errori gravi (permessi, I/O) → rilancia per gestione a livello superiore
        console.error(`Errore critico lettura ${MODEL_FILENAME}:`, err.message);
        throw err;
    }
}

/**
 * Salva il modello completo (assets + flows) nella directory specificata.
 * Crea la directory se manca e formatta il JSON per leggibilità.
 * 
 * @async
 * @param {Object} model - Modello da salvare con proprietà `assets` e `flows`
 * @param {Array<Object>} model.assets - Lista di asset da salvare
 * @param {Array<Object>} model.flows - Lista di flussi da salvare
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<void>}
 * @throws {Error} Se la scrittura fallisce (permessi, disco pieno, ecc.)
 * 
 * @example
 * // Salva nel progetto attivo
 * await saveModel({ assets: [...], flows: [...] }, req.projectDir);
 * 
 * // Salva nella directory di fallback
 * await saveModel({ assets: [], flows: [] });
 */
async function saveModel(model, projectDir) {
    const dir = projectDir || DEFAULT_DATA_DIR;
    const filePath = path.join(dir, MODEL_FILENAME);

    // Assicura che la directory esista (crea ricorsivamente se manca)
    await fs.mkdir(dir, { recursive: true });

    // Formatta JSON con indentazione per leggibilità e debugging
    const content = JSON.stringify(
        {
            assets: model.assets || [],
            flows: model.flows || []
        },
        null,
        2
    );

    await fs.writeFile(filePath, content, 'utf-8');
}

module.exports = { loadModel, saveModel };