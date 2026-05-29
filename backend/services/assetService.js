/**
 * @file Servizio per la gestione degli asset (business logic)
 * @module services/assetService
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Recupera tutti gli asset dal modello persistente.
 * @async
 * @returns {Promise<Array<Object>>} Lista di asset.
 * @example
 * const assets = await getAllAssets();
 */
async function getAllAssets() {
    const model = await loadModel();
    return model.assets;
}

/**
 * Crea un nuovo asset e lo salva.
 * @async
 * @param {Object} assetData - Dati dell'asset.
 * @param {string} assetData.name - Nome dell'asset (obbligatorio).
 * @param {string} assetData.category - Categoria (es. "External Entity", "Process", "Data Store").
 * @param {string} [assetData.description] - Descrizione opzionale.
 * @returns {Promise<Object>} Asset creato, con `id` e `createdAt` generati.
 * @throws {Error} Se il salvataggio fallisce.
 * @example
 * const newAsset = await createAsset({ name: "Database", category: "Data Store" });
 */
async function createAsset(assetData) {
    const model = await loadModel();
    const newAsset = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...assetData
    };
    model.assets.push(newAsset);
    await saveModel(model);
    return newAsset;
}

/**
 * Importa una lista di asset (append semplice, senza deduplica).
 * @async
 * @param {Array<Object>} assets - Lista di asset da importare.
 * @returns {Promise<{imported: number}>} Numero di asset importati.
 * @example
 * const result = await importAssets([{ name: "API", category: "Process" }]);
 */
async function importAssets(assets) {
    const model = await loadModel();
    const newAssets = assets.map(a => ({
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...a
    }));
    model.assets.push(...newAssets);
    await saveModel(model);
    return { imported: newAssets.length };
}

/**
 * Aggiorna un asset esistente.
 * @async
 * @param {string} id - ID dell'asset da aggiornare.
 * @param {Object} updates - Dati da aggiornare (name, category, description, ...).
 * @returns {Promise<Object>} Asset aggiornato.
 * @throws {Error} Se l'asset con l'ID specificato non esiste.
 * @example
 * const updated = await updateAsset("abc-123", { name: "Nuovo nome" });
 */
async function updateAsset(id, updates) {
    const model = await loadModel();
    const index = model.assets.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Asset non trovato: ${id}`);
    const updated = { ...model.assets[index], ...updates, id };
    model.assets[index] = updated;
    await saveModel(model);
    return updated;
}

/**
 * Elimina un asset per ID.
 * @async
 * @param {string} id - ID dell'asset da eliminare.
 * @returns {Promise<{success: boolean}>}
 * @throws {Error} Se l'asset non esiste.
 */
async function deleteAsset(id) {
    const model = await loadModel();
    const initialLength = model.assets.length;
    model.assets = model.assets.filter(a => a.id !== id);
    if (model.assets.length === initialLength) throw new Error(`Asset non trovato: ${id}`);
    await saveModel(model);
    return { success: true };
}

module.exports = {
    getAllAssets,
    createAsset,
    importAssets,
    updateAsset,
    deleteAsset
};