const { loadManifest, getMethodology, loadTaxonomy, buildExtractionPrompt, __resetCache } = require('../../services/methodologyService');

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn()
    }
}));

const fs = require('fs').promises;

describe('MethodologyService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __resetCache();  // resetta la cache tra i test
    });

    test('loadManifest carica manifest.json', async () => {
        const mockManifest = {
            methodologies: [
                { id: 'a', name: 'A', enabled: true, path: './a', taxonomyFile: 'tax.json', promptFile: 'p.md' }
            ]
        };
        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
        const manifest = await loadManifest();
        expect(manifest.methodologies).toHaveLength(1);
        expect(manifest.methodologies[0].id).toBe('a');
    });

    test('getMethodology restituisce metodologia abilitata', async () => {
        const mockManifest = {
            methodologies: [
                { id: 'enabled', enabled: true, path: './e', taxonomyFile: 'tax.json', promptFile: 'p.md' },
                { id: 'disabled', enabled: false, path: './d', taxonomyFile: 'tax.json', promptFile: 'p.md' }
            ]
        };
        fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
        const result = await getMethodology('enabled');
        expect(result.id).toBe('enabled');
        await expect(getMethodology('disabled')).rejects.toThrow('non trovata o disabilitata');
    });

    test('loadTaxonomy carica e mette in cache', async () => {
        const mockManifest = {
            methodologies: [{ id: 'test', enabled: true, path: './test', taxonomyFile: 'tax.json', promptFile: 'p.md' }]
        };
        const mockTaxonomy = { categories: [] };
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest));
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockTaxonomy));
        const taxonomy = await loadTaxonomy('test');
        expect(taxonomy).toEqual(mockTaxonomy);
        // la seconda chiamata non deve rileggere il file
        const taxonomy2 = await loadTaxonomy('test');
        expect(taxonomy2).toEqual(mockTaxonomy);
        expect(fs.readFile).toHaveBeenCalledTimes(2); // manifest + taxonomy una sola volta
    });

    test('buildExtractionPrompt genera prompt con variabili', async () => {
        const mockManifest = {
            methodologies: [{ id: 'test', enabled: true, path: './test', taxonomyFile: 'tax.json', promptFile: 'p.md' }]
        };
        const mockTaxonomy = {
            categories: [
                { name: 'Process' },
                { name: 'Data Store' }
            ]
        };
        const mockTemplate = 'Categorie: {{categories}}\nContenuto: {{chunkContent}}\nRAG: {{#if ragContext}}{{ragContext}}{{/if}}';
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest));
        fs.readFile.mockResolvedValueOnce(JSON.stringify(mockTaxonomy));
        fs.readFile.mockResolvedValueOnce(mockTemplate);

        const prompt = await buildExtractionPrompt('test', 'testo chunk', 'contesto RAG');
        expect(prompt).toContain('Categorie: Process, Data Store');
        expect(prompt).toContain('Contenuto: testo chunk');
        expect(prompt).toContain('RAG: contesto RAG');
    });
});