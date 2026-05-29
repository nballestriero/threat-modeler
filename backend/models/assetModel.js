/**
 * @file Modello per la gestione del file threat-model.json
 * @module models/assetModel
 */

const fs = require('fs').promises;
const path = require('path');

const DEFAULT_JSON_FILE = path.join(__dirname, '../threat-model.json');
const JSON_FILE = process.env.TEST_JSON_FILE || DEFAULT_JSON_FILE;
/**
 * Carica il modello completo (assets + flows)
 * @async
 * @returns {Promise<{assets: Array, flows: Array}>}
 */
async function loadModel() {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { assets: [], flows: [] };
    }
}

/**
 * Salva il modello completo
 * @async
 * @param {Object} model - Modello da salvare
 * @returns {Promise<void>}
 */
async function saveModel(model) {
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
}

module.exports = { loadModel, saveModel };