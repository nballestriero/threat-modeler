/**
 * @file Servizio per la gestione degli asset (business logic CRUD)
 * @description Gestisce creazione, lettura, aggiornamento ed eliminazione degli asset.
 *              I dati vengono persistiti nel modello JSON tramite {@link ../models/assetModel}.
 *              ✅ FIX: Aggiunta gestione errori in getAllAssets per fallback sicuro,
 *              validazione input in createAsset, e allineamento return di importAssets
 *              con il controller ({ saved, duplicates }).
 * @module services/assetService
 * 
 * @see {@link ../models/assetModel} Modello di persistenza JSON
 * @see {@link ../controllers/assetController} Controller HTTP che usa questo service
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * @typedef {Object} Asset
 * @property {string} id - Identificativo univoco generato con UUID v4
 * @property {string} name - Nome dell'asset (obbligatorio, univoco per deduplica)
 * @property {string} category - Categoria DFD (es. "External Entity", "Process", "Data Store")
 * @property {string} [description] - Descrizione opzionale dell'asset
 * @property {string} createdAt - Timestamp ISO di creazione
 * @property {string} [updatedAt] - Timestamp ISO di ultimo aggiornamento
 * @property {Object} [evidence] - Metadati opzionali per tracciabilità RAG
 * @property {Array} [evidence.chunks] - Chunk di testo da cui è stato estratto l'asset
 * @property {string} [evidence.source] - Fonte del documento originale
 */

/**
 * Recupera tutti gli asset dal modello persistente.
 * @async
 * @returns {Promise<Array<Asset>>} Lista completa degli asset presenti nel file JSON.
 *                                  Restituisce array vuoto in caso di errore di lettura.
 * @example
 * const assets = await getAllAssets();
 * console.log(`Trovati ${assets.length} asset`);
 * // → [ { id: 'abc-123', name: 'Database', category: 'Data Store', ... }, ... ]
 */
async function getAllAssets() {
    try {
        const model = await loadModel();
        return model.assets || [];
    } catch (err) {
        // Log per debug, ma non far crashare l'app
        console.error('⚠️ [assetService] Errore lettura assets:', err.message);
        return []; // Fallback sicuro: frontend vede lista vuota invece di crash
    }
}

/**
 * Crea un nuovo asset e lo salva nel modello.
 * @async
 * @param {Object} assetData - Dati dell'asset da creare.
 * @param {string} assetData.name - Nome dell'asset (obbligatorio, non vuoto).
 * @param {string} assetData.category - Categoria DFD (es. "External Entity", "Process", "Data Store").
 * @param {string} [assetData.description] - Descrizione opzionale.
 * @returns {Promise<Asset>} L'asset creato, con `id` e `createdAt` generati automaticamente.
 * @throws {Error} Se manca il nome o il salvataggio fallisce.
 * @example
 * const newAsset = await createAsset({ 
 *   name: "Database Utenti", 
 *   category: "Data Store",
 *   description: "Archivio principale dati sensibili"
 * });
 * console.log(newAsset.id); // → 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
async function createAsset(assetData) {
    if (!assetData.name?.trim()) {
        throw new Error('Il campo "name" è obbligatorio e non può essere vuoto');
    }

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
 * Importa una lista di asset in blocco.
 * Applica deduplicazione basata sul nome (case-insensitive) per evitare record ripetuti.
 * @async
 * @param {Array<Object>} assets - Lista di asset da importare.
 * @returns {Promise<{saved: number, duplicates: number}>} Conteggio asset salvati e duplicati ignorati.
 * @example
 * const result = await importAssets([
 *   { name: "API Gateway", category: "Process" },
 *   { name: "Database", category: "Data Store" }
 * ]);
 * console.log(`Salvati: ${result.saved}, Duplicati: ${result.duplicates}`);
 * // → "Salvati: 2, Duplicati: 0"
 */
async function importAssets(assets) {
    const model = await loadModel();
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

    await saveModel(model);
    return { saved, duplicates };
}

/**
 * Aggiorna un asset esistente.
 * @async
 * @param {string} id - ID univoco dell'asset da aggiornare.
 * @param {Object} updates - Campi da aggiornare (es. `{ name: "Nuovo Nome" }`).
 * @returns {Promise<Asset>} L'asset aggiornato con tutti i campi (originali + modifiche).
 * @throws {Error} Se l'asset con l'ID specificato non viene trovato.
 * @example
 * const updated = await updateAsset("abc-123", { 
 *   name: "Database Produzione",
 *   description: "Archivio aggiornato con nuovi campi"
 * });
 * console.log(updated.updatedAt); // → '2025-05-31T10:30:00.000Z' (se aggiunto)
 */
async function updateAsset(id, updates) {
    const model = await loadModel();
    const index = model.assets.findIndex(a => a.id === id);

    if (index === -1) throw new Error(`Asset non trovato: ${id}`);

    // Merge sicuro: preserva ID e createdAt, sovrascrive solo i campi forniti
    model.assets[index] = { ...model.assets[index], ...updates, id };
    await saveModel(model);
    return model.assets[index];
}

/**
 * Elimina un asset per ID e tutti i flussi correlati (cascade delete).
 * @async
 * @param {string} id - ID univoco dell'asset da eliminare.
 * @returns {Promise<{success: boolean, message: string, orphanFlowsDeleted: number}>} 
 *          Conferma dell'eliminazione con conteggio flussi orfani rimossi.
 * @throws {Error} Se l'asset non esiste nel modello.
 * @example
 * const result = await deleteAsset("abc-123");
 * console.log(result.orphanFlowsDeleted); // → 2 (flussi orfani eliminati)
 */
async function deleteAsset(id) {
    const model = await loadModel();
    const initialLength = model.assets.length;

    // Filtra gli asset: rimuovi quello con l'ID specificato
    const filteredAssets = model.assets.filter(a => a.id !== id);

    if (filteredAssets.length === initialLength) {
        throw new Error(`Asset non trovato: ${id}`);
    }

    // Cascade delete: rimuovi tutti i flussi che referenziano l'asset eliminato
    const initialFlowsLength = model.flows?.length || 0;
    const filteredFlows = (model.flows || []).filter(
        f => f.fromId !== id && f.toId !== id
    );
    const orphanFlowsDeleted = initialFlowsLength - filteredFlows.length;

    // Salva il modello aggiornato con asset e flussi filtrati
    await saveModel({
        assets: filteredAssets,
        flows: filteredFlows
    });

    return {
        success: true,
        message: `Asset ${id} eliminato con successo`,
        orphanFlowsDeleted
    };
}

module.exports = {
    getAllAssets,
    createAsset,
    importAssets,
    updateAsset,
    deleteAsset
};