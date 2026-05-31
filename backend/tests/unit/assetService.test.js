/**
 * @file Test unitari per assetService.js
 * @description Verifica le funzioni CRUD, il formato di return di importAssets, 
 *              la deduplica per nome e la gestione errori.
 *              Usa mock per isolare il service dal filesystem reale.
 * @module tests/unit/assetService.test
 * 
 * @jest-environment node
 */

// ============================================================================
// IMPORT E MOCK
// ============================================================================

const { v4: uuidv4 } = require('uuid');
// ✅ Percorsi relativi corretti da: backend/tests/unit/
const assetService = require('../../services/assetService');
const { loadModel, saveModel } = require('../../models/assetModel');

// Mock del modello di persistenza: tutti i test operano in memoria, 
// senza toccare il file threat-model.json reale.
jest.mock('../../models/assetModel');

// ============================================================================
// DATI DI TEST RIUTILIZZABILI
// ============================================================================

/** @type {Object} Asset di test valido */
const VALID_ASSET = {
    name: 'Test Asset',
    category: 'Process',
    description: 'Descrizione di test'
};

/** @type {Object} Asset duplicato (stesso nome, case diverso) */
const DUPLICATE_ASSET = {
    name: 'test asset',  // lowercase: dovrebbe essere riconosciuto come duplicato
    category: 'Data Store'
};

/** @type {string} ID fittizio per test di errore */
const FAKE_ID = uuidv4();

// ============================================================================
// SETUP E TEARDOWN
// ============================================================================

/**
 * Resetta i mock prima di ogni test per garantire isolamento.
 */
beforeEach(() => {
    jest.clearAllMocks();
});

// ============================================================================
// TEST SU CRUD BASE (getAll, create, update, delete)
// ============================================================================

describe('Asset Service - CRUD di base', () => {

    /**
     * Verifica che getAllAssets deleghi correttamente a loadModel 
     * e restituisca l'array di asset.
     */
    test('getAllAssets restituisce la lista di asset dal modello', async () => {
        const mockAssets = [{ id: '1', name: 'Test' }];
        loadModel.mockResolvedValue({ assets: mockAssets, flows: [] });

        const result = await assetService.getAllAssets();

        expect(result).toEqual(mockAssets);
        expect(loadModel).toHaveBeenCalledTimes(1);
        expect(saveModel).not.toHaveBeenCalled(); // getAll non deve scrivere
    });

    /**
     * Verifica che createAsset:
     * 1. Generi id e createdAt automaticamente
     * 2. Chiami saveModel con l'asset aggiunto all'array
     * 3. Restituisca l'asset creato
     */
    test('createAsset aggiunge un nuovo asset con metadati automatici', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const newAsset = { name: 'Nuovo Asset', category: 'Process' };
        const created = await assetService.createAsset(newAsset);

        // Verifica struttura risposta
        expect(created).toMatchObject({
            name: 'Nuovo Asset',
            category: 'Process'
        });
        expect(created).toHaveProperty('id');
        expect(created).toHaveProperty('createdAt');
        expect(typeof created.createdAt).toBe('string'); // ISO string

        // Verifica che saveModel sia stato chiamato con l'asset aggiunto
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ name: 'Nuovo Asset' })
                ])
            })
        );
    });

    /**
     * Verifica la validazione input: name è obbligatorio.
     */
    test('createAsset lancia errore se il campo name è mancante o vuoto', async () => {
        await expect(assetService.createAsset({ category: 'Process' }))
            .rejects
            .toThrow('Il campo "name" è obbligatorio');

        await expect(assetService.createAsset({ name: '', category: 'Process' }))
            .rejects
            .toThrow('Il campo "name" è obbligatorio');
    });

    /**
     * Verifica che updateAsset:
     * 1. Trovi l'asset per ID
     * 2. Faccia merge dei campi (preservando id e createdAt)
     * 3. Salvi le modifiche
     */
    test('updateAsset modifica solo i campi specificati, preserva id e createdAt', async () => {
        const originalCreatedAt = new Date().toISOString();
        const existingAsset = {
            id: 'abc-123',
            name: 'Vecchio Nome',
            category: 'Process',
            createdAt: originalCreatedAt
        };
        const mockModel = { assets: [existingAsset], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const updates = { name: 'Nuovo Nome', description: 'Nuova descrizione' };
        const updated = await assetService.updateAsset('abc-123', updates);

        // Verifica merge corretto
        expect(updated.name).toBe('Nuovo Nome');
        expect(updated.description).toBe('Nuova descrizione');
        expect(updated.category).toBe('Process'); // invariato
        expect(updated.id).toBe('abc-123'); // ID mai modificato
        expect(updated.createdAt).toBe(originalCreatedAt); // createdAt preservato

        // Verifica persistenza simulata
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ name: 'Nuovo Nome' })
                ])
            })
        );
    });

    /**
     * Verifica gestione errore: asset non trovato per update.
     */
    test('updateAsset lancia errore se l\'asset con l\'ID specificato non esiste', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);

        await expect(assetService.updateAsset(FAKE_ID, { name: 'x' }))
            .rejects
            .toThrow(`Asset non trovato: ${FAKE_ID}`);

        expect(saveModel).not.toHaveBeenCalled(); // Nessuna scrittura se errore
    });

    /**
     * Verifica che deleteAsset rimuova l'asset e chiami saveModel.
     */
    test('deleteAsset rimuove l\'asset dal modello e salva', async () => {
        const assetToDelete = { id: 'del-123', name: 'Da eliminare' };
        const mockModel = { assets: [assetToDelete, { id: 'keep-456' }], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const result = await assetService.deleteAsset('del-123');

        expect(result.success).toBe(true);
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.not.arrayContaining([
                    expect.objectContaining({ id: 'del-123' })
                ])
            })
        );
    });

    /**
     * Verifica gestione errore: asset non trovato per delete.
     */
    test('deleteAsset lancia errore se l\'asset non esiste', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);

        await expect(assetService.deleteAsset(FAKE_ID))
            .rejects
            .toThrow(`Asset non trovato: ${FAKE_ID}`);
    });
});

// ============================================================================
// TEST SU importAssets (critico: formato return e deduplica)
// ============================================================================

describe('Asset Service - importAssets e deduplica', () => {

    /**
     * ✅ TEST CRITICO: Verifica che importAssets restituisca 
     * { saved: number, duplicates: number } e NON { imported: number }.
     * Questo allinea il service con assetExtractionController.js.
     */
    test('importAssets restituisce formato { saved, duplicates } allineato al controller', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const assetsToImport = [
            { name: 'Asset 1', category: 'Process' },
            { name: 'Asset 2', category: 'Data Store' }
        ];

        const result = await assetService.importAssets(assetsToImport);

        // ✅ Verifica formato corretto (fix bug: saved/duplicates undefined)
        expect(result).toHaveProperty('saved');
        expect(result).toHaveProperty('duplicates');
        expect(result).not.toHaveProperty('imported'); // Vecchio formato, deve essere assente

        expect(result.saved).toBe(2);
        expect(result.duplicates).toBe(0);
        expect(typeof result.saved).toBe('number');
        expect(typeof result.duplicates).toBe('number');
    });

    /**
     * Verifica la deduplica case-insensitive per nome.
     * Asset con nome uguale (anche con case diverso) non devono essere duplicati.
     */
    test('importAssets deduplica asset per nome (confronto case-insensitive)', async () => {
        // Scenario: il modello contiene già un asset "Test Asset"
        const existingAsset = { id: 'existing-1', name: 'Test Asset', category: 'Process' };
        const mockModel = { assets: [existingAsset], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        // Tenta di importare un asset con nome uguale ma case diverso
        const result = await assetService.importAssets([DUPLICATE_ASSET]);

        expect(result.saved).toBe(0); // Nessuno nuovo salvato (era duplicato)
        expect(result.duplicates).toBe(1); // Uno riconosciuto come duplicato

        // Verifica che saveModel sia stato chiamato (anche se nessun nuovo asset, 
        // il service potrebbe comunque salvare per consistenza)
        expect(saveModel).toHaveBeenCalled();
    });

    /**
     * Verifica che asset senza name vengano ignorati silenziosamente.
     */
    test('importAssets ignora asset privi del campo name obbligatorio', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const result = await assetService.importAssets([
            { category: 'Process' },           // manca name
            { name: '', category: 'Data Store' }, // name vuoto
            VALID_ASSET                        // valido
        ]);

        expect(result.saved).toBe(1); // Solo l'asset valido viene salvato
        expect(result.duplicates).toBe(0);
    });

    /**
     * Verifica scenario misto: alcuni asset nuovi, alcuni duplicati.
     */
    test('importAssets gestisce mix di asset nuovi e duplicati', async () => {
        const existingAsset = { id: 'ex-1', name: 'Già presente', category: 'Process' };
        const mockModel = { assets: [existingAsset], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const result = await assetService.importAssets([
            { name: 'Già presente', category: 'External Entity' }, // duplicato
            { name: 'Nuovo 1', category: 'Process' },              // nuovo
            { name: 'Nuovo 2', category: 'Data Store' },           // nuovo
            { name: 'nuovo 1', category: 'Process' }               // duplicato case-insensitive
        ]);

        expect(result.saved).toBe(2); // "Nuovo 1" e "Nuovo 2"
        expect(result.duplicates).toBe(2); // "Già presente" e "nuovo 1"
    });
});

// ============================================================================
// TEST SU GESTIONE ERRORI E ROBUSTEZZA
// ============================================================================

describe('Asset Service - Gestione errori e fallback', () => {

    /**
     * Verifica che getAllAssets gestisca errori di lettura restituendo array vuoto.
     * Questo previene crash del frontend se il file JSON è corrotto o mancante.
     */
    test('getAllAssets gestisce errori di loadModel restituendo array vuoto', async () => {
        // Simula errore di lettura file
        loadModel.mockRejectedValue(new Error('File corrotto'));

        const result = await assetService.getAllAssets();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
        // Il service dovrebbe loggare l'errore internamente (verificabile con spy su console se necessario)
    });

    /**
     * Verifica che createAsset propaghi errori di saveModel.
     */
    test('createAsset propaga errori di saveModel al chiamante', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockRejectedValue(new Error('Permesso negato'));

        await expect(assetService.createAsset(VALID_ASSET))
            .rejects
            .toThrow('Permesso negato');
    });

    /**
     * Verifica che updateAsset non modifichi il modello se l'asset non viene trovato.
     */
    test('updateAsset non chiama saveModel se l\'asset non esiste', async () => {
        const mockModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(mockModel);

        await expect(assetService.updateAsset(FAKE_ID, { name: 'x' }))
            .rejects
            .toThrow();

        expect(saveModel).not.toHaveBeenCalled(); // Nessuna scrittura in caso di errore
    });
});