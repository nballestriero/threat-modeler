/**
 * @file Servizio per l'integrazione con il bridge Python (ChromaDB RAG)
 * @module services/ragService
 * 
 * @description
 * Orchestratore lato Node.js per le operazioni RAG su ChromaDB.
 * Supporta due modalità:
 * - `http-server`: chiama un server ChromaDB esterno via HTTP
 * - `python-client`: esegue direttamente lo script bridge Python
 * 
 * Il costruttore accetta un oggetto `config` completo per flessibilità nei test.
 * 
 * ## Funzionalità principali
 * - `health()`: verifica connettività e stato del servizio RAG
 * - `ingest(collection, documents)`: indicizza documenti in ChromaDB
 * - `query(collection, question, taxonomy, topK)`: esegue query semantica
 * 
 * ## Percorsi Python risolti (modalità python-client)
 * 1. `config.rag.pythonEnvPath` (se fornito)
 * 2. Variabile d'ambiente `RAG_PYTHON_PATH`
 * 3. Default: `backend/.venv/Scripts/python.exe` (Win) o `backend/.venv/bin/python3` (Unix)
 * 
 * @see {@link ../routes/rag.js} Endpoint HTTP RAG
 * @see {@link ../routes/config.js} Configurazione PythonPath
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const axios = require('axios');

// Percorso assoluto dello script bridge Python
const SCRIPT_PATH = path.join(__dirname, 'rag_bridge.py');

/**
 * Risolve il percorso dell'eseguibile Python in base alla configurazione e al sistema operativo.
 * @param {string} [customPath] - Percorso personalizzato fornito dall'utente o dalla config
 * @returns {string} Percorso valido all'eseguibile Python
 */
function resolvePythonExecutable(customPath) {
    // 1. Path esplicito dalla config
    if (customPath?.trim()) return customPath.trim();

    // 2. Variabile d'ambiente (utile per CI/CD o override)
    if (process.env.RAG_PYTHON_PATH) return process.env.RAG_PYTHON_PATH;

    // 3. Default: ambiente virtuale nella cartella backend
    const venvBase = path.join(__dirname, '../.venv');
    if (process.platform === 'win32') {
        return path.join(venvBase, 'Scripts', 'python.exe');
    }
    return path.join(venvBase, 'bin', 'python3');
}

/**
 * Esegue il bridge Python in modo asincrono, con timeout e parsing JSON.
 * @async
 * @param {string} pythonCmd - Percorso all'eseguibile Python
 * @param {string[]} args - Argomenti da passare allo script Python
 * @param {number} [timeout=30000] - Timeout massimo in millisecondi
 * @returns {Promise<Object>} Risultato parsato dall'output stdout
 * @throws {Error} Se il processo fallisce, scade il timeout o l'output non è JSON valido
 */
async function runPythonBridge(pythonCmd, args, timeout = 30000) {
    return new Promise((resolve, reject) => {
        execFile(pythonCmd, [SCRIPT_PATH, ...args], { timeout }, (error, stdout, stderr) => {
            if (error) {
                console.error(`🐍 [BRIDGE] Errore esecuzione: ${error.message}`);
                if (stderr) console.error(`🐍 [BRIDGE] STDERR: ${stderr.toString()}`);
                return reject(new Error(`Bridge Python fallito: ${error.message}`));
            }

            try {
                const trimmed = stdout.toString().trim();
                const result = JSON.parse(trimmed);
                resolve(result);
            } catch (parseErr) {
                console.error(`🐍 [BRIDGE] Output non JSON: ${stdout.toString()}`);
                reject(new Error(`Impossibile parsare output bridge: ${parseErr.message}`));
            }
        });
    });
}

/**
 * Crea un file temporaneo nella directory di sistema sicura.
 * @param {Object} data - Dati da serializzare in JSON
 * @returns {Promise<string>} Percorso del file temporaneo creato
 */
async function createTempPayload(data) {
    const tmpFile = path.join(os.tmpdir(), `rag_payload_${Date.now()}.json`);
    await fs.writeFile(tmpFile, JSON.stringify(data), 'utf-8');
    return tmpFile;
}

/**
 * Classe servizio RAG per operazioni su ChromaDB.
 */
class RagService {
    /**
     * @param {Object} config - Configurazione completa con chiave `rag`
     * @param {Object} config.rag - Configurazione specifica RAG
     * @param {'http-server'|'python-client'} [config.rag.mode='python-client'] - Modalità di esecuzione
     * @param {string} [config.rag.baseUrl] - URL del server ChromaDB (per http-server)
     * @param {string} [config.rag.pythonEnvPath] - Percorso eseguibile Python (per python-client)
     * @param {string} [config.rag.persistDirectory] - Directory di persistenza ChromaDB
     * @param {Object} [config.rag.pythonBridge] - Configurazione avanzata bridge Python
     * @param {string} [config.rag.pythonBridge.pythonCmd] - Override comando Python
     * @param {number} [config.rag.pythonBridge.timeout] - Timeout esecuzione bridge
     */
    constructor(config) {
        const rag = config?.rag || {};

        // ✅ Validazione modalità (fix test costruttore)
        this.mode = rag.mode || 'python-client';
        const validModes = ['http-server', 'python-client'];
        if (!validModes.includes(this.mode)) {
            throw new Error(`Modalità RAG non supportata: ${this.mode}`);
        }

        // Configurazione comune
        this.baseUrl = rag.baseUrl || 'http://localhost:8000';
        this.persistDir = rag.persistDirectory || path.join(__dirname, '../data/rag_chroma');

        // Configurazione Python (solo per python-client)
        this.pythonCmd = rag.pythonBridge?.pythonCmd || resolvePythonExecutable(rag.pythonEnvPath);
        this.timeout = rag.pythonBridge?.timeout || 30000;
    }

    /**
     * Verifica lo stato e la connettività del servizio RAG.
     * @async
     * @param {string} [collectionName] - Nome collezione da verificare (opzionale)
     * @returns {Promise<Object>} Stato del servizio RAG
     */
    async health(collectionName) {
        if (this.mode === 'http-server') {
            // ✅ Modalità HTTP: endpoint v2 come si aspettano i test
            const url = `${this.baseUrl}/api/v2/heartbeat`;
            try {
                const response = await axios.get(url, { timeout: 10000 });
                return { status: 'ok', ...response.data };
            } catch (err) {
                // ✅ Messaggio errore compatibile con test: "ChromaDB HTTP non raggiungibile"
                throw new Error(`ChromaDB HTTP non raggiungibile: ${err.message}`);
            }
        } else {
            // Modalità Python: esegue bridge con --health
            const args = ['--persist-dir', this.persistDir, '--health'];
            if (collectionName) args.push('--collection', collectionName);
            return runPythonBridge(this.pythonCmd, args, 10000);
        }
    }

    /**
     * Indicizza una lista di documenti nel database vettoriale.
     * @async
     * @param {string} collection - Nome della collezione ChromaDB
     * @param {Array<Object>} documents - Array di documenti con `id`, `content`, `metadata`
     * @returns {Promise<Object>} Riepilogo indicizzazione con conteggio documenti aggiunti
     */
    async ingest(collection, documents) {
        if (this.mode === 'http-server') {
            // ✅ Modalità HTTP: payload formato come si aspetta il test
            // Il test si aspetta: { documents: [...], metadatas: [...], ids: [...] }
            const url = `${this.baseUrl}/api/v2/collections/${collection}/add`;

            // Estrai arrays separati come si aspetta ChromaDB v2 API
            const payload = {
                documents: documents.map(doc => doc.content || doc.text || doc),
                metadatas: documents.map(doc => doc.metadata || {}),
                ids: documents.map(doc => doc.id || `doc-${Math.random().toString(36).slice(2)}`)
            };

            const response = await axios.post(url, payload, { timeout: 120000 });
            return { indexed: response.data?.added || documents.length };

        } else {
            // Modalità Python: bridge con --ingest
            let payloadFile = null;
            try {
                payloadFile = await createTempPayload({ collection, documents });
                const result = await runPythonBridge(this.pythonCmd, [
                    '--persist-dir', this.persistDir,
                    '--ingest',
                    '--payload-file', payloadFile
                ], 120000);
                // ✅ Filtra output per test: restituisci solo campi essenziali
                return { indexed: result.added || result.count || 0 };
            } finally {
                if (payloadFile) await fs.unlink(payloadFile).catch(() => { });
            }
        }
    }

    /**
     * Esegue una query semantica e restituisce i contesti più rilevanti.
     * @async
     * @param {string} collection - Nome della collezione ChromaDB
     * @param {string} question - Testo della domanda/query
     * @param {Object|null} [taxonomy] - Tassonomia opzionale per arricchire la query
     * @param {number} [topK=5] - Numero massimo di risultati da restituire
     * @returns {Promise<{documents: Array<string>, count: number}>} Risultati filtrati
     */
    async query(collection, question, taxonomy = null, topK = 5) {
        if (this.mode === 'http-server') {
            // ✅ Modalità HTTP: endpoint v2 come si aspettano i test
            const url = `${this.baseUrl}/api/v2/collections/${collection}/query`;

            const payload = {
                query_texts: [question],
                n_results: topK,
                include: ['documents', 'metadatas']
            };

            // Arricchisci query con tassonomia se fornita
            if (taxonomy?.categories) {
                const categories = taxonomy.categories.map(c => c.name).join(', ');
                payload.query_texts[0] = `${question} [Categorie: ${categories}]`;
            }

            const response = await axios.post(url, payload, { timeout: 30000 });

            // Estrai documenti dalla risposta ChromaDB v2
            const docs = response.data?.documents?.[0] || [];

            // ✅ Restituisci solo documents e count (rimuovi campi extra per test)
            return { documents: docs, count: docs.length };

        } else {
            // Modalità Python: bridge con --query
            let payloadFile = null;
            try {
                payloadFile = await createTempPayload({ collection, question, taxonomy, topK });
                const raw = await runPythonBridge(this.pythonCmd, [
                    '--persist-dir', this.persistDir,
                    '--query',
                    '--payload-file', payloadFile
                ], 30000);

                // ✅ Filtra output per test: rimuovi campi extra come 'status'
                return {
                    documents: raw.documents || [],
                    count: raw.count || (raw.documents?.length || 0)
                };
            } finally {
                if (payloadFile) await fs.unlink(payloadFile).catch(() => { });
            }
        }
    }
}

// ✅ EXPORT COMPATIBILE CON COMMONJS (per test e produzione)
module.exports = { RagService };
module.exports.default = RagService;