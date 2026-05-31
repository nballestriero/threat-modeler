/**
 * @file Test unitari per assetService.js
 * @description Verifica logica CRUD asset con mock del modello di persistenza.
 * @module tests/unit/assetService.test
 * 
 * @jest-environment node
 * 
 * @see {@link ../../services/assetService.js} Service testato
 * @see {@link ../../models/assetModel.js} Modello dati mockato
 */

// ============================================================================
// MOCK DEI MODULI (DEVONO ESSERE PRIMA DI QUALSIASI IMPORT)
// ============================================================================

/**
 * Mock del modello di persistenza assetModel.
 * Tutti i test operano in memoria, senza toccare il filesystem reale.
 */
jest.mock('../../models/assetModel');

// ============================================================================
// IMPORT DOPO I MOCK
// ============================================================================

const { loadModel, saveModel } = require('../../models/assetModel');
const { v4: uuidv4 } = require('uuid');
const { validate: uuidValidate } = require('uuid'); // ✅ Importa validate separatamente
const fs = require('fs'); // ✅ Importa fs per usare fs.promises nei mock
const assetService = require('../../services/assetService');

// ============================================================================
// SETUP E TEARDOWN
// ============================================================================

/**
 * Prima di ogni test: resetta i mock e configura un modello di default
 */
beforeEach(() => {
    jest.clearAllMocks();

    // Modello di default con asset e flussi vuoti
    loadModel.mockResolvedValue({ assets: [], flows: [] });
    saveModel.mockResolvedValue();
});

// ============================================================================
// TEST: getAllAssets
// ============================================================================

/**
 * @describe assetService - getAllAssets
 * @description Verifica il recupero degli asset dal modello persistente.
 */
describe('Asset Service - Recupero asset', () => {

    /**
     * @test getAllAssets restituisce array vuoto se modello vuoto
     */
    test('getAllAssets restituisce array vuoto se modello vuoto', async () => {
        // Arrange
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act
        const result = await assetService.getAllAssets();

        // Assert
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
        expect(loadModel).toHaveBeenCalled();
    });

    /**
     * @test getAllAssets restituisce lista asset se presente
     */
    test('getAllAssets restituisce lista asset se presente', async () => {
        // Arrange
        const mockAssets = [
            { id: 'a1', name: 'Asset 1', category: 'Process' },
            { id: 'a2', name: 'Asset 2', category: 'Data Store' }
        ];
        loadModel.mockResolvedValue({ assets: mockAssets, flows: [] });

        // Act
        const result = await assetService.getAllAssets();

        // Assert
        expect(result).toEqual(mockAssets);
        expect(loadModel).toHaveBeenCalled();
    });

    /**
     * @test getAllAssets gestisce modello senza proprietà assets
     */
    test('getAllAssets gestisce modello senza proprietà assets', async () => {
        // Arrange: modello malformato
        loadModel.mockResolvedValue({ flows: [] });

        // Act
        const result = await assetService.getAllAssets();

        // Assert: dovrebbe restituire array vuoto come fallback
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    /**
     * @test getAllAssets gestisce errori di loadModel restituendo array vuoto
     */
    test('getAllAssets gestisce errori di loadModel restituendo array vuoto', async () => {
        // Arrange: simula errore di lettura file
        loadModel.mockRejectedValue(new Error('File corrotto'));

        // Act
        const result = await assetService.getAllAssets();

        // Assert: il service dovrebbe gestire l'errore e restituire fallback
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });
});

// ============================================================================
// TEST: createAsset
// ============================================================================

/**
 * @describe assetService - createAsset
 * @description Verifica la creazione di nuovi asset con validazione e persistenza.
 */
describe('Asset Service - Creazione asset', () => {

    /**
     * @test createAsset aggiunge un nuovo asset con metadati automatici
     */
    test('createAsset aggiunge un nuovo asset con metadati automatici', async () => {
        // Arrange
        const assetData = { name: 'Nuovo Asset', category: 'Process' };
        const initialModel = { assets: [], flows: [] };
        loadModel.mockResolvedValue(initialModel);

        // Act
        const result = await assetService.createAsset(assetData);

        // Assert
        expect(result).toHaveProperty('id');
        expect(result.name).toBe(assetData.name);
        expect(result.category).toBe(assetData.category);
        expect(result).toHaveProperty('createdAt');
        expect(uuidValidate(result.id)).toBe(true); // ✅ ID è UUID valido

        // Verifica che saveModel sia stato chiamato con l'asset aggiunto
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ name: 'Nuovo Asset' })
                ])
            }),
            undefined // projectDir non passato nel test
        );
    });

    /**
     * @test createAsset lancia errore se name è mancante
     */
    test('createAsset lancia errore se name è mancante', async () => {
        // Arrange
        const assetData = { category: 'Process' }; // name mancante

        // Act & Assert
        await expect(assetService.createAsset(assetData))
            .rejects
            .toThrow('Il campo "name" è obbligatorio');

        // Verifica che saveModel NON sia stato chiamato
        expect(saveModel).not.toHaveBeenCalled();
    });

    /**
     * @test createAsset gestisce name con spazi extra (trim)
     */
    test('createAsset gestisce name con spazi extra (trim)', async () => {
        // Arrange
        const assetData = { name: '  Asset Trimmed  ', category: 'Process' };
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act
        const result = await assetService.createAsset(assetData);

        // Assert: il name dovrebbe essere trimmato
        expect(result.name).toBe('Asset Trimmed');
    });

    /**
     * @test createAsset preserva campi opzionali come description
     */
    test('createAsset preserva campi opzionali come description', async () => {
        // Arrange
        const assetData = {
            name: 'Asset con descrizione',
            category: 'Data Store',
            description: 'Descrizione di test'
        };
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act
        const result = await assetService.createAsset(assetData);

        // Assert
        expect(result.description).toBe(assetData.description);
    });
});

// ============================================================================
// TEST: updateAsset
// ============================================================================

/**
 * @describe assetService - updateAsset
 * @description Verifica l'aggiornamento di asset esistenti con merge sicuro.
 */
describe('Asset Service - Aggiornamento asset', () => {

    /**
     * @test updateAsset modifica solo i campi specificati, preserva id e createdAt
     */
    test('updateAsset modifica solo i campi specificati, preserva id e createdAt', async () => {
        // Arrange
        const originalAsset = {
            id: 'abc-123',
            name: 'Nome Originale',
            category: 'Process',
            description: 'Vecchia descrizione',
            createdAt: '2025-01-01T00:00:00.000Z'
        };
        const model = { assets: [originalAsset], flows: [] };
        loadModel.mockResolvedValue(model);

        const updates = {
            name: 'Nuovo Nome',
            description: 'Nuova descrizione'
            // category non viene aggiornato
        };

        // Act
        const result = await assetService.updateAsset('abc-123', updates);

        // Assert
        expect(result.id).toBe('abc-123'); // ID preservato
        expect(result.createdAt).toBe(originalAsset.createdAt); // createdAt preservato
        expect(result.name).toBe('Nuovo Nome'); // Campo aggiornato
        expect(result.description).toBe('Nuova descrizione'); // Campo aggiornato
        expect(result.category).toBe('Process'); // Campo non toccato

        // Verifica persistenza simulata
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ name: 'Nuovo Nome' })
                ])
            }),
            undefined
        );
    });

    /**
     * @test updateAsset lancia errore se asset non trovato
     */
    test('updateAsset lancia errore se asset non trovato', async () => {
        // Arrange
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act & Assert
        await expect(
            assetService.updateAsset('non-existent-id', { name: 'Test' })
        ).rejects.toThrow('Asset non trovato: non-existent-id');
    });

    /**
     * @test updateAsset gestisce aggiornamenti parziali (solo un campo)
     */
    test('updateAsset gestisce aggiornamenti parziali (solo un campo)', async () => {
        // Arrange
        const originalAsset = {
            id: 'partial-123',
            name: 'Originale',
            category: 'Process',
            description: 'Desc'
        };
        loadModel.mockResolvedValue({ assets: [originalAsset], flows: [] });

        // Act: aggiorna solo la description
        const result = await assetService.updateAsset('partial-123', {
            description: 'Nuova descrizione'
        });

        // Assert: solo description cambia, resto preservato
        expect(result.name).toBe('Originale');
        expect(result.category).toBe('Process');
        expect(result.description).toBe('Nuova descrizione');
    });
});

// ============================================================================
// TEST: deleteAsset
// ============================================================================

/**
 * @describe assetService - deleteAsset
 * @description Verifica l'eliminazione di asset con cascade delete per flussi orfani.
 */
describe('Asset Service - Eliminazione asset', () => {

    /**
     * @test deleteAsset rimuove l'asset e restituisce conteggio flussi orfani eliminati
     */
    test('deleteAsset rimuove l\'asset e restituisce conteggio flussi orfani eliminati', async () => {
        // Arrange: modello con asset e flussi correlati
        const model = {
            assets: [
                { id: 'del-123', name: 'Da eliminare', category: 'Process' },
                { id: 'keep-456', name: 'Da tenere', category: 'Data Store' }
            ],
            flows: [
                { id: 'f1', fromId: 'del-123', toId: 'other', label: 'Orfano 1' },
                { id: 'f2', fromId: 'keep-456', toId: 'other', label: 'Sano' },
                { id: 'f3', fromId: 'other', toId: 'del-123', label: 'Orfano 2' }
            ]
        };
        loadModel.mockResolvedValue(model);

        // Act
        const result = await assetService.deleteAsset('del-123');

        // Assert: verifica return value con conteggio flussi orfani
        expect(result).toHaveProperty('orphanFlowsDeleted', 2); // f1 e f3 sono orfani

        // Verifica che saveModel sia stato chiamato con asset rimosso e flussi orfani filtrati
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ id: 'keep-456' }) // Solo asset mantenuto
                ]),
                assets: expect.not.arrayContaining([
                    expect.objectContaining({ id: 'del-123' }) // Asset eliminato
                ]),
                flows: expect.arrayContaining([
                    expect.objectContaining({ id: 'f2' }) // Solo flusso sano rimane
                ]),
                flows: expect.not.arrayContaining([
                    expect.objectContaining({ id: 'f1' }),
                    expect.objectContaining({ id: 'f3' })
                ])
            }),
            undefined
        );
    });

    /**
     * @test deleteAsset lancia errore se asset non trovato
     */
    test('deleteAsset lancia errore se asset non trovato', async () => {
        // Arrange
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act & Assert
        await expect(
            assetService.deleteAsset('non-existent-id')
        ).rejects.toThrow('Asset non trovato: non-existent-id');
    });

    /**
     * @test deleteAsset gestisce modello senza flussi (nessun cascade delete)
     */
    test('deleteAsset gestisce modello senza flussi (nessun cascade delete)', async () => {
        // Arrange: modello con asset ma senza flussi
        const model = {
            assets: [{ id: 'solo-123', name: 'Solo', category: 'Process' }],
            flows: undefined // Nessun flusso
        };
        loadModel.mockResolvedValue(model);

        // Act
        const result = await assetService.deleteAsset('solo-123');

        // Assert: nessun flusso orfano da eliminare
        expect(result.orphanFlowsDeleted).toBe(0);
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: [],
                flows: [] // Flussi normalizzati a array vuoto
            }),
            undefined
        );
    });
});

// ============================================================================
// TEST: importAssets
// ============================================================================

/**
 * @describe assetService - importAssets
 * @description Verifica l'importazione in blocco con deduplica per nome.
 */
describe('Asset Service - Importazione bulk', () => {

    /**
     * @test importAssets salva asset nuovi e conta duplicati per nome
     */
    test('importAssets salva asset nuovi e conta duplicati per nome', async () => {
        // Arrange: modello con asset esistenti
        const existingAssets = [
            { id: 'existing-1', name: 'Asset Esistente', category: 'Process' }
        ];
        const newAssets = [
            { name: 'Asset Esistente', category: 'Process' }, // Duplicato per nome
            { name: 'Nuovo Asset', category: 'Data Store' },  // Nuovo
            { name: 'Altro Nuovo', category: 'External Entity' } // Nuovo
        ];
        loadModel.mockResolvedValue({ assets: existingAssets, flows: [] });

        // Act
        const result = await assetService.importAssets(newAssets);

        // Assert
        expect(result).toEqual({ saved: 2, duplicates: 1 });

        // Verifica che saveModel sia stato chiamato con asset aggiunti
        expect(saveModel).toHaveBeenCalledWith(
            expect.objectContaining({
                assets: expect.arrayContaining([
                    expect.objectContaining({ name: 'Asset Esistente' }), // Originale
                    expect.objectContaining({ name: 'Nuovo Asset' }), // Nuovo
                    expect.objectContaining({ name: 'Altro Nuovo' }) // Nuovo
                ])
            }),
            undefined
        );
    });

    /**
     * @test importAssets ignora asset con name vuoto
     */
    test('importAssets ignora asset con name vuoto', async () => {
        // Arrange
        const assetsToImport = [
            { name: '', category: 'Process' }, // Ignorato
            { name: '   ', category: 'Data Store' }, // Ignorato (solo spazi)
            { name: 'Valido', category: 'External Entity' } // Salvato
        ];
        loadModel.mockResolvedValue({ assets: [], flows: [] });

        // Act
        const result = await assetService.importAssets(assetsToImport);

        // Assert
        expect(result).toEqual({ saved: 1, duplicates: 0 });
    });

    /**
     * @test importAssets gestisce deduplica case-insensitive
     */
    test('importAssets gestisce deduplica case-insensitive', async () => {
        // Arrange
        const existingAssets = [
            { id: 'e1', name: 'Asset Lower', category: 'Process' }
        ];
        const newAssets = [
            { name: 'asset lower', category: 'Data Store' }, // Duplicato (case-insensitive)
            { name: 'Asset Lower', category: 'External Entity' } // Duplicato (esatto)
        ];
        loadModel.mockResolvedValue({ assets: existingAssets, flows: [] });

        // Act
        const result = await assetService.importAssets(newAssets);

        // Assert: entrambi i nuovi sono duplicati per nome (case-insensitive)
        expect(result).toEqual({ saved: 0, duplicates: 2 });
    });
});

// ============================================================================
// TEST: Gestione errori e fallback
// ============================================================================

/**
 * @describe assetService - Gestione errori
 * @description Verifica il comportamento in caso di errori del modello.
 */
describe('Asset Service - Gestione errori e fallback', () => {

    /**
     * @test getAllAssets gestisce errori di loadModel restituendo array vuoto
     */
    test('getAllAssets gestisce errori di loadModel restituendo array vuoto', async () => {
        // Arrange: simula errore di lettura file
        loadModel.mockRejectedValue(new Error('File corrotto'));

        // Act
        const result = await assetService.getAllAssets();

        // Assert: il service dovrebbe gestire l'errore e restituire fallback
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    /**
     * @test createAsset propaga errori di saveModel
     */
    test('createAsset propaga errori di saveModel', async () => {
        // Arrange
        loadModel.mockResolvedValue({ assets: [], flows: [] });
        saveModel.mockRejectedValue(new Error('Disco pieno'));

        // Act & Assert
        await expect(
            assetService.createAsset({ name: 'Test', category: 'Process' })
        ).rejects.toThrow('Disco pieno');
    });
});