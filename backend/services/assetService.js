/**
 * @file Servizio per la gestione degli asset (business logic CRUD)
 * @module services/assetService
 * 
 * @description
 * Gestisce le operazioni CRUD per gli asset DFD, operando sul modello JSON condiviso
 * con i flussi. Supporta l'isolamento dei dati per progetto tramite `projectDir`.
 * 
 * ## Struttura dati asset
 * ```json
 * {
 *   "id": "uuid-v4",
 *   "name": "Nome dell'asset",
 *   "category": "External Entity|Process|Data Store",
 *   "description": "Descrizione opzionale",
 *   "createdAt": "ISO-8601 timestamp",
 *   "evidence": { ... } // Metadati opzionali per tracciabilità RAG
 * }
 * ```
 * 
 * @see {@link ../models/assetModel.js} Modello dati condiviso asset+flows
 * @see {@link ../middleware/projectScope.js} Middleware che inietta req.projectDir
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} Asset
 * @property {string} id - Identificativo univoco UUID v4
 * @property {string} name - Nome dell'asset (obbligatorio)
 * @property {string} category - Categoria DFD: 'External Entity' | 'Process' | 'Data Store'
 * @property {string} [description] - Descrizione opzionale
 * @property {string} createdAt - Timestamp ISO di creazione
 * @property {Object} [evidence] - Metadati opzionali per tracciabilità RAG
 */

/**
 * Recupera tutti gli asset dal modello persistente del progetto specifico.
 * @async
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Asset[]>} Lista di asset, o array vuoto se nessuno presente
 * @example
 * const assets = await getAllAssets(req.projectDir);
 * console.log(assets.map(a => a.name));
 */
async function getAllAssets(projectDir) {
    try {
        const model = await loadModel(projectDir);
        return model.assets || [];
    } catch (err) {
        // ✅ Gestisci errori di loadModel restituendo fallback
        console.error('Errore in getAllAssets:', err.message);
        return [];
    }
}

/**
 * Crea un nuovo asset nel progetto specifico.
 * @async
 * @param {Object} assetData - Dati dell'asset da creare
 * @param {string} assetData.name - Nome dell'asset (obbligatorio)
 * @param {string} assetData.category - Categoria DFD (obbligatoria)
 * @param {string} [assetData.description] - Descrizione opzionale
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Asset>} Asset creato con ID generato e timestamp
 * @throws {Error} Se il campo name è mancante o vuoto
 * @example
 * const asset = await createAsset({
 *   name: 'API Gateway',
 *   category: 'Process',
 *   description: 'Punto di ingresso per le richieste esterne'
 * }, req.projectDir);
 */
async function createAsset(assetData, projectDir) {
    if (!assetData.name?.trim()) {
        throw new Error('Il campo "name" è obbligatorio e non può essere vuoto');
    }

    // ✅ Trimma name, description, owner prima di salvare
    const trimmedData = {
        ...assetData,
        name: assetData.name.trim(),
        description: assetData.description?.trim(),
        owner: assetData.owner?.trim()
    };

    const model = await loadModel(projectDir);
    const newAsset = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...trimmedData // ✅ Usa dati trimmati
    };

    model.assets = model.assets || [];
    model.assets.push(newAsset);
    await saveModel(model, projectDir);
    return newAsset;
}

/**
 * Aggiorna un asset esistente nel progetto specifico.
 * @async
 * @param {string} id - ID dell'asset da aggiornare
 * @param {Object} updates - Campi da modificare (parziali)
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<Asset>} Asset aggiornato con tutti i campi
 * @throws {Error} Se l'asset con l'ID specificato non viene trovato
 * @example
 * const updated = await updateAsset('asset-123', {
 *   name: 'API Gateway Produzione',
 *   description: 'Aggiornato con rate limiting'
 * }, req.projectDir);
 */
async function updateAsset(id, updates, projectDir) {
    const model = await loadModel(projectDir);
    if (!model.assets) model.assets = [];

    const index = model.assets.findIndex(a => a.id === id);
    if (index === -1) {
        throw new Error(`Asset non trovato: ${id}`);
    }

    // Merge sicuro: preserva ID, sovrascrive solo i campi forniti
    model.assets[index] = { ...model.assets[index], ...updates, id };

    await saveModel(model, projectDir);
    return model.assets[index];
}

/**
 * Elimina un asset nel progetto specifico con cascade delete per flussi orfani.
 * @async
 * @param {string} id - ID dell'asset da eliminare
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<{orphanFlowsDeleted: number}>} Conteggio flussi eliminati
 * @throws {Error} Se l'asset con l'ID specificato non viene trovato
 * @example
 * const result = await deleteAsset('asset-123', req.projectDir);
 * console.log(`Flussi orfani eliminati: ${result.orphanFlowsDeleted}`);
 */
async function deleteAsset(id, projectDir) {
    const model = await loadModel(projectDir);
    if (!model.assets) model.assets = [];

    const initialLength = model.assets.length;

    // ✅ Conta flussi orfani prima di eliminarli (cascade delete)
    const initialFlowsLength = model.flows?.length || 0;
    model.flows = (model.flows || []).filter(f => f.fromId !== id && f.toId !== id);
    const orphanFlowsDeleted = initialFlowsLength - (model.flows?.length || 0);

    model.assets = model.assets.filter(a => a.id !== id);

    if (model.assets.length === initialLength) {
        throw new Error(`Asset non trovato: ${id}`);
    }

    await saveModel(model, projectDir);

    // ✅ Restituisci conteggio flussi eliminati
    return { orphanFlowsDeleted };
}

/**
 * Importa asset in blocco nel progetto specifico con deduplica per nome.
 * @async
 * @param {Array<Object>} assets - Lista di asset da importare
 * @param {string} [projectDir] - Percorso della directory del progetto attivo
 * @returns {Promise<{saved: number, duplicates: number}>} Conteggio asset salvati e duplicati ignorati
 * @example
 * const result = await importAssets([
 *   { name: 'API Gateway', category: 'Process' },
 *   { name: 'Database', category: 'Data Store' }
 * ], req.projectDir);
 * console.log(`Salvati: ${result.saved}, Duplicati: ${result.duplicates}`);
 */
async function importAssets(assets, projectDir) {
    const model = await loadModel(projectDir);
    if (!model.assets) model.assets = [];

    let saved = 0;
    let duplicates = 0;

    // Set per controllo rapido duplicati per nome (case-insensitive)
    const existingNames = new Set(model.assets.map(a => a.name?.toLowerCase()));

    for (const a of assets) {
        if (!a.name?.trim()) continue;

        const normalizedName = a.name.trim().toLowerCase();

        if (existingNames.has(normalizedName)) {
            duplicates++;
        } else {
            model.assets.push({
                id: uuidv4(),
                createdAt: new Date().toISOString(),
                ...a
            });
            existingNames.add(normalizedName);
            saved++;
        }
    }

    await saveModel(model, projectDir);
    return { saved, duplicates };
}

module.exports = {
    getAllAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    importAssets
};