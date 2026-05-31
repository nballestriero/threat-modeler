/**
 * @file Servizio per l'integrazione con il bridge Python (ChromaDB RAG)
 * @module services/ragService
 * 
 * @description
 * Orchestratore lato Node.js per le operazioni RAG su ChromaDB tramite bridge Python.
 * Gestisce risoluzione cross-platform dell'interprete Python, esecuzione asincrona 
 * con timeout, parsing JSON della risposta e pulizia automatica dei file temporanei.
 * Supporta configurazione dinamica del percorso Python via UI o variabile d'ambiente.
 * 
 * ## Funzionalità principali
 * - `health()`: verifica connettività e stato del bridge Python
 * - `ingest(documents)`: indicizza documenti in ChromaDB
 * - `query(question, topK)`: esegue query semantica e restituisce contesti
 * 
 * ## Percorsi Python risolti
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
 * @param {string[]} args - Argomenti da passare allo script Python
 * @param {number} [timeout=30000] - Timeout massimo in millisecondi
 * @returns {Promise<Object>} Risultato parsato dall'output stdout
 * @throws {Error} Se il processo fallisce, scade il timeout o l'output non è JSON valido
 */
async function runPythonBridge(args, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const pythonCmd = resolvePythonExecutable(process.env.RAG_PYTHON_PATH);

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
     * @param {string} [persistDir] - Directory di persistenza ChromaDB. Default: `backend/data/rag_chroma`
     */
    constructor(persistDir) {
        this.persistDir = persistDir || path.join(__dirname, '../data/rag_chroma');
    }

    /**
     * Verifica lo stato e la connettività del bridge Python e ChromaDB.
     * @async
     * @returns {Promise<Object>} Stato del servizio RAG
     */
    async health() {
        return runPythonBridge(['--persist-dir', this.persistDir, '--health'], 10000);
    }

    /**
     * Indicizza una lista di documenti nel database vettoriale.
     * @async
     * @param {Array<Object>} documents - Array di documenti con `id`, `content`, `metadata`
     * @returns {Promise<Object>} Riepilogo indicizzazione
     */
    async ingest(documents) {
        let payloadFile = null;
        try {
            payloadFile = await createTempPayload(documents);
            return await runPythonBridge([
                '--persist-dir', this.persistDir,
                '--ingest',
                '--payload-file', payloadFile
            ], 120000);
        } finally {
            // Pulizia automatica file temporaneo
            if (payloadFile) await fs.unlink(payloadFile).catch(() => { });
        }
    }

    /**
     * Esegue una query semantica e restituisce i contesti più rilevanti.
     * @async
     * @param {string} question - Testo della domanda/query
     * @param {number} [topK=5] - Numero massimo di risultati da restituire
     * @returns {Promise<Array<Object>>} Array di documenti contestuali con score
     */
    async query(question, topK = 5) {
        let payloadFile = null;
        try {
            payloadFile = await createTempPayload({ question, topK });
            return await runPythonBridge([
                '--persist-dir', this.persistDir,
                '--query',
                '--payload-file', payloadFile
            ], 30000);
        } finally {
            if (payloadFile) await fs.unlink(payloadFile).catch(() => { });
        }
    }
}

// ✅ EXPORT COMPATIBILE CON COMMONJS: sia named che default
module.exports = { RagService };
module.exports.default = RagService;