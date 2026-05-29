// tests/unit/assetExtractionPipeline.test.js
const { AssetExtractionPipeline } = require('../../services/assetExtractionPipeline');
const textExtractor = require('../../services/textExtractorService');
const chunkService = require('../../services/chunkService');
const ollamaService = require('../../services/ollamaService');
const { RagService } = require('../../services/ragService');
const methodologyService = require('../../services/methodologyService');
const assetMergeService = require('../../services/assetMergeService');

jest.mock('../../services/textExtractorService');
jest.mock('../../services/chunkService');
jest.mock('../../services/ollamaService');
jest.mock('../../services/ragService');
jest.mock('../../services/methodologyService');
jest.mock('../../services/assetMergeService');

describe('AssetExtractionPipeline', () => {
    let pipeline;
    let mockConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfig = {
            ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3' },
            rag: { enabled: false }
        };
        pipeline = new AssetExtractionPipeline(mockConfig);
    });

    test('esegue estrazione base senza chunking e senza RAG', async () => {
        const input = {
            files: ['doc.pdf'],
            methodology: 'dfd-base',
            options: { useChunking: false, useRag: false }
        };
        const mockText = 'Contenuto del documento';
        textExtractor.extractTextFromFile.mockResolvedValue(mockText);
        chunkService.splitTextIntoChunks.mockReturnValue([{ content: mockText, index: 0 }]);
        methodologyService.buildExtractionPrompt.mockResolvedValue('mock prompt');
        ollamaService.callOllama.mockResolvedValue('[{"name":"Asset1","category":"Process","description":"test"}]');
        assetMergeService.mergeAssetsBySimilarity.mockReturnValue([{ name: 'Asset1', category: 'Process' }]);

        const result = await pipeline.extract(input);
        expect(result.assets).toHaveLength(1);
        expect(result.rawOccurrences).toBe(1);
        expect(result.chunksProcessed).toBe(1);
        expect(ollamaService.callOllama).toHaveBeenCalledTimes(1);
    });

    test('usa chunking e RAG se abilitati', async () => {
        const input = {
            files: ['doc.pdf'],
            contextFiles: ['context.txt'],
            methodology: 'dfd-base',
            options: { useChunking: true, maxChunkSize: 500, chunkOverlap: 50, useRag: true }
        };
        mockConfig.rag.enabled = true;
        mockConfig.rag.mode = 'http-server';
        pipeline = new AssetExtractionPipeline(mockConfig);

        const mockText = 'a '.repeat(600);
        textExtractor.extractTextFromFile.mockResolvedValue(mockText);
        chunkService.splitTextIntoChunks.mockReturnValue([
            { content: 'chunk1', index: 0 },
            { content: 'chunk2', index: 1 }
        ]);
        // Mock del RagService (ma non usiamo il costruttore reale)
        const mockRagService = {
            query: jest.fn().mockResolvedValue({ documents: ['context1'] }),
            ingest: jest.fn().mockResolvedValue({ indexed: 1 })
        };
        pipeline.ragService = mockRagService;

        methodologyService.buildExtractionPrompt.mockResolvedValue('prompt con rag');
        ollamaService.callOllama.mockResolvedValue('[{"name":"Asset2","category":"Data Store"}]');
        assetMergeService.mergeAssetsBySimilarity.mockReturnValue([{ name: 'Asset2' }]);

        const result = await pipeline.extract(input);
        expect(result.chunksProcessed).toBe(2);
        expect(mockRagService.query).toHaveBeenCalledTimes(2);
        expect(ollamaService.callOllama).toHaveBeenCalledTimes(2);
    });

    test('gestisce errore durante estrazione', async () => {
        const input = {
            files: ['doc.pdf'],
            methodology: 'dfd-base',
            options: { useChunking: false, useRag: false }
        };
        textExtractor.extractTextFromFile.mockRejectedValue(new Error('File non trovato'));
        await expect(pipeline.extract(input)).rejects.toThrow('File non trovato');
    });
});