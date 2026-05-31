/**
 * @file Helper per test di integrazione RAG con ChromaDB
 * @module tests/helpers/chromaTestHelper
 * 
 * @description
 * Fornisce utility per creare directory temporanee isolate per test RAG,
 * istanziare RagService con configurazione di test e pulire le risorse dopo l'esecuzione.
 * Previene conflitti tra test paralleli e garantisce cleanup automatico.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { RagService } = require('../../services/ragService');

/**
 * Crea una directory temporanea unica per test ChromaDB.
 * @async
 * @returns {Promise<string>} Percorso della directory temporanea
 */
async function createTempChromaDir() {
    const tempDir = path.join(os.tmpdir(), `tmp_chroma_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
}

/**
 * Pulisce una directory temporanea ChromaDB.
 * @async
 * @param {string} tempDir - Percorso della directory da eliminare
 * @returns {Promise<void>}
 */
async function cleanupTempChromaDir(tempDir) {
    if (!tempDir || typeof tempDir !== 'string') {
        console.warn('⚠️ [chromaTestHelper] cleanupTempChromaDir: tempDir non valido, skip cleanup');
        return;
    }
    try {
        await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
        console.warn(`⚠️ [chromaTestHelper] Impossibile pulire ${tempDir}:`, err.message);
    }
}

/**
 * Crea un'istanza di RagService configurata per test con directory temporanea.
 * @async
 * @param {Object} configOverrides - Override per configurazione default
 * @returns {Promise<{ragService: RagService, persistDir: string}>} Istanza service + path persistenza
 */
async function createRagServiceWithTempDir(configOverrides = {}) {
    const persistDir = await createTempChromaDir();

    const defaultConfig = {
        rag: {
            enabled: true,
            mode: 'python-client',
            pythonEnvPath: '',
            baseUrl: 'http://localhost:8000',
            persistDirectory: persistDir
        }
    };

    const config = { ...defaultConfig, ...configOverrides };
    const ragService = new RagService(config);

    return { ragService, persistDir };
}

module.exports = {
    createTempChromaDir,
    cleanupTempChromaDir,
    createRagServiceWithTempDir
};