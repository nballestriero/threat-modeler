// backend/services/ragService.js
/**
 * @file Servizio per interfacciarsi con ChromaDB (RAG)
 * @module services/ragService
 */

const axios = require('axios');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

/**
 * Esegue una chiamata al bridge Python (rag_bridge.py)
 * @param {string} scriptPath - Percorso assoluto dello script
 * @param {string} persistDir - Directory persistente ChromaDB
 * @param {string} command - 'health', 'query', 'ingest'
 * @param {string|null} payloadFile - Percorso file payload (per query/ingest)
 * @param {string|null} pythonCmd - Interprete Python
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>}
 */
async function runPythonBridge(scriptPath, persistDir, command, payloadFile = null, pythonCmd = null, timeout = 120000) {
    return new Promise((resolve, reject) => {
        const args = ['--persist-dir', persistDir];
        if (command === 'health') args.push('--health');
        else if (command === 'query') {
            args.push('--query');
            if (payloadFile) args.push('--payload-file', payloadFile);
            else reject(new Error('Payload file richiesto per query'));
        } else if (command === 'ingest') {
            args.push('--ingest');
            if (payloadFile) args.push('--payload-file', payloadFile);
            else reject(new Error('Payload file richiesto per ingest'));
        } else {
            reject(new Error(`Comando sconosciuto: ${command}`));
        }

        const finalPythonCmd = pythonCmd || process.env.PYTHON_CMD || 'python';
        console.log(`🐍 [BRIDGE] Esecuzione: ${finalPythonCmd} ${scriptPath} ${args.join(' ')}`);

        execFile(finalPythonCmd, [scriptPath, ...args], { timeout }, (error, stdout, stderr) => {
            if (error) {
                console.error(`🐍 [BRIDGE] Errore: ${error.message}`);
                if (stderr) console.error(`🐍 [BRIDGE] STDERR: ${stderr}`);
                reject(new Error(`Bridge Python fallito: ${error.message}`));
                return;
            }
            if (stderr) console.warn(`🐍 [BRIDGE] STDERR (non fatale): ${stderr}`);
            try {
                const result = JSON.parse(stdout);
                if (result.status === 'error') reject(new Error(result.error));
                else resolve(result);
            } catch (err) {
                console.error(`🐍 [BRIDGE] Output non JSON: ${stdout}`);
                reject(new Error(`Impossibile parsare output bridge: ${err.message}`));
            }
        });
    });
}

/**
 * Scrive un payload JSON in un file temporaneo nella directory di sistema
 * @param {Object} payload
 * @returns {Promise<string>}
 */
async function writeTempPayload(payload) {
    const tempFile = path.join(os.tmpdir(), `rag_payload_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.json`);
    await fs.writeFile(tempFile, JSON.stringify(payload), 'utf-8');
    return tempFile;
}

/**
 * Client per ChromaDB in modalità HTTP server
 */
class ChromaHttpClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async health() {
        try {
            await axios.get(`${this.baseUrl}/api/v2/heartbeat`, { timeout: 5000 });
            return { status: 'ok' };
        } catch (err) {
            throw new Error(`ChromaDB HTTP non raggiungibile: ${err.message}`);
        }
    }
    async query(collection, queryText, nResults = 5) {
        const response = await axios.post(`${this.baseUrl}/api/v2/collections/${collection}/query`, {
            query_texts: [queryText],
            n_results: nResults,
            include: ['documents']
        }, { timeout: 30000 });
        const docs = response.data.documents?.[0] || [];
        return { documents: docs, count: docs.length };
    }
    async ingest(collection, documents) {
        const ids = documents.map((_, idx) => `doc_${Date.now()}_${idx}`);
        const response = await axios.post(`${this.baseUrl}/api/v2/collections/${collection}/add`, {
            ids,
            documents: documents.map(d => d.text),
            metadatas: documents.map(d => d.metadata || {})
        }, { timeout: 60000 });
        return { indexed: response.data.added || documents.length };
    }
}

/**
 * Servizio RAG principale
 */
class RagService {
    constructor(config) {
        this.config = config.rag || {};
        this.mode = this.config.mode || 'python-client';
        this.pythonCmd = this.config.pythonBridge?.pythonCmd || process.env.PYTHON_CMD || 'python';
        this.persistDir = this.config.persistDirectory || './chroma_data';

        if (this.mode === 'http-server') {
            this.client = new ChromaHttpClient(this.config.baseUrl || 'http://localhost:8000');
        } else if (this.mode === 'python-client') {
            const relativeScript = this.config.pythonBridge?.scriptPath || './services/rag_bridge.py';
            this.scriptPath = path.isAbsolute(relativeScript) ? relativeScript : path.resolve(process.cwd(), relativeScript);
            console.log(`🐍 [RAG] scriptPath = ${this.scriptPath}`);
        } else {
            throw new Error(`Modalità RAG non supportata: ${this.mode}`);
        }
    }

    async health() {
        if (this.mode === 'http-server') return await this.client.health();
        else return await runPythonBridge(this.scriptPath, this.persistDir, 'health', null, this.pythonCmd);
    }

    async query(collection, queryText, taxonomy = null, nResults = 5) {
        let enrichedQuery = queryText;
        if (taxonomy && taxonomy.categories) {
            const categoryNames = taxonomy.categories.map(c => c.name).join(', ');
            enrichedQuery = `[Categorie: ${categoryNames}] ${queryText}`;
        }
        if (this.mode === 'http-server') {
            return await this.client.query(collection, enrichedQuery, nResults);
        } else {
            const payload = { collection, query: enrichedQuery, n_results: nResults };
            const tempFile = await writeTempPayload(payload);
            try {
                const result = await runPythonBridge(this.scriptPath, this.persistDir, 'query', tempFile, this.pythonCmd);
                return { documents: result.documents, count: result.count };
            } finally {
                await fs.unlink(tempFile).catch(() => { });
            }
        }
    }

    async ingest(collection, documents) {
        if (this.mode === 'http-server') {
            return await this.client.ingest(collection, documents);
        } else {
            const payload = {
                collection,
                documents: documents.map(doc => ({
                    id: doc.id || `doc_${Date.now()}_${Math.random()}`,
                    text: doc.text,
                    metadata: doc.metadata || {}
                }))
            };
            const tempFile = await writeTempPayload(payload);
            try {
                const result = await runPythonBridge(this.scriptPath, this.persistDir, 'ingest', tempFile, this.pythonCmd);
                return { indexed: result.indexed };
            } finally {
                await fs.unlink(tempFile).catch(() => { });
            }
        }
    }
}

module.exports = { RagService };