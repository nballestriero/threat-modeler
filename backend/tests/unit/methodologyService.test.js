/**
 * @file Test unitari per methodologyService.js
 * @module tests/unit/methodologyService.test
 * 
 * @jest-environment node
 * 
 * @description
 * Verifica il caricamento e la validazione delle metodologie.
 * Mocka fs.promises per isolare i test dal filesystem reale.
 * 
 * @see {@link ../../services/methodologyService.js} Service testato
 */

// ============================================================================
// ⚠️ MOCK DI fs.promises PRIMA DI QUALSIASI IMPORT
// ============================================================================

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        promises: {
            ...originalFs.promises,
            readFile: jest.fn()
        }
    };
});

const fs = require('fs').promises;
const methodologyService = require('../../services/methodologyService');

// ============================================================================
// SETUP E TEARDOWN
// ============================================================================

beforeEach(() => {
    jest.clearAllMocks();
    methodologyService.__resetCache?.();
});

afterAll(() => {
    methodologyService.__resetCache?.();
});

// ============================================================================
// TEST: loadManifest
// ============================================================================

describe('MethodologyService', () => {

    test('loadManifest carica e mette in cache il manifest', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'dfd-base', name: 'DFD Base', enabled: true }
            ]
        };

        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest));

        const result = await methodologyService.loadManifest();

        expect(result).toEqual(mockManifest);
        expect(fs.readFile).toHaveBeenCalledWith(
            expect.stringContaining('methodologies/manifest.json'),
            'utf-8'
        );

        // Seconda chiamata: usa cache
        const cached = await methodologyService.loadManifest();
        expect(cached).toBe(result); // Stesso riferimento (cache)
        expect(fs.readFile).toHaveBeenCalledTimes(1); // Non rilegge
    });

    test('loadManifest restituisce fallback se il file non esiste', async () => {
        fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

        const result = await methodologyService.loadManifest();

        expect(result).toEqual({ version: '1.0', methods: [] });
    });

    // ============================================================================
    // TEST: getMethodology (con mock per metodologie fittizie)
    // ============================================================================

    test('getMethodology restituisce metodologia esistente', async () => {
        // Mock manifest con metodologia "test"
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'test', name: 'Test Method', enabled: true, rag: { enabled: false } }
            ]
        };

        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

        const result = await methodologyService.getMethodology('test');

        expect(result).toMatchObject({
            id: 'test',
            name: 'Test Method',
            enabled: true
        });
    });

    test('getMethodology lancia errore per metodologia inesistente', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'dfd-base', name: 'DFD Base', enabled: true }
            ]
        };

        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

        await expect(methodologyService.getMethodology('nonexistent'))
            .rejects.toThrow('Metodologia non trovata: nonexistent');
    });

    // ============================================================================
    // TEST: loadTaxonomy (con mock per file di test)
    // ============================================================================

    test('loadTaxonomy carica e mette in cache la tassonomia', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'test', name: 'Test', enabled: true }
            ]
        };

        const mockTaxonomy = {
            categories: [
                { name: 'TestCat', color: '#ff0000', colorBg: '#ffeeee' }
            ]
        };

        // Mock readFile per manifest E taxonomy
        fs.readFile.mockImplementation((filePath) => {
            if (filePath.includes('manifest.json')) {
                return Promise.resolve(JSON.stringify(mockManifest));
            }
            if (filePath.includes('test/taxonomy.json')) {
                return Promise.resolve(JSON.stringify(mockTaxonomy));
            }
            return Promise.reject(new Error('File non mockato: ' + filePath));
        });

        const result = await methodologyService.loadTaxonomy('test');

        expect(result).toEqual(mockTaxonomy);

        // Seconda chiamata: usa cache
        const cached = await methodologyService.loadTaxonomy('test');
        expect(cached).toBe(result);
    });

    test('loadTaxonomy lancia errore se taxonomy.json manca', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'test', name: 'Test', enabled: true }
            ]
        };

        fs.readFile.mockImplementation((filePath) => {
            if (filePath.includes('manifest.json')) {
                return Promise.resolve(JSON.stringify(mockManifest));
            }
            // Per taxonomy: simula file non trovato
            return Promise.reject({ code: 'ENOENT' });
        });

        await expect(methodologyService.loadTaxonomy('test'))
            .rejects.toThrow('Tassonomia mancante per metodologia test');
    });

    // ============================================================================
    // TEST: buildExtractionPrompt
    // ============================================================================

    test('buildExtractionPrompt genera prompt con variabili sostituite', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'test', name: 'Test', enabled: true }
            ]
        };

        const mockTaxonomy = {
            categories: [
                { name: 'Cat1' },
                { name: 'Cat2' }
            ]
        };

        const mockPromptTemplate = 'Categorie: {{CATEGORIES}}\nContenuto: {{CONTENT}}';

        fs.readFile.mockImplementation((filePath) => {
            if (filePath.includes('manifest.json')) {
                return Promise.resolve(JSON.stringify(mockManifest));
            }
            if (filePath.includes('test/taxonomy.json')) {
                return Promise.resolve(JSON.stringify(mockTaxonomy));
            }
            if (filePath.includes('test/prompts/extraction.md')) {
                return Promise.resolve(mockPromptTemplate);
            }
            return Promise.reject(new Error('File non mockato: ' + filePath));
        });

        const result = await methodologyService.buildExtractionPrompt(
            'test',
            'Questo è il contenuto di test',
            []
        );

        expect(result).toContain('Categorie: Cat1, Cat2');
        expect(result).toContain('Contenuto: Questo è il contenuto di test');
    });

    // ============================================================================
    // TEST: supportsRag
    // ============================================================================

    test('supportsRag restituisce true se rag.enabled è true', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'rag-enabled', name: 'RAG Enabled', enabled: true, rag: { enabled: true } }
            ]
        };

        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

        const result = await methodologyService.supportsRag('rag-enabled');
        expect(result).toBe(true);
    });

    test('supportsRag restituisce false se rag.enabled è false o assente', async () => {
        const mockManifest = {
            version: '1.0',
            methods: [
                { id: 'no-rag', name: 'No RAG', enabled: true, rag: { enabled: false } },
                { id: 'no-rag-key', name: 'No Rag Key', enabled: true }
            ]
        };

        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));

        await expect(methodologyService.supportsRag('no-rag')).resolves.toBe(false);
        await expect(methodologyService.supportsRag('no-rag-key')).resolves.toBe(false);
    });
});