const { createRagServiceWithTempDir, cleanupTempChromaDir } = require('../helpers/chromaTestHelper');

describe('RAG reale con bridge Python', () => {
    let ragService, persistDir;

    beforeAll(async () => {
        const setup = await createRagServiceWithTempDir();
        ragService = setup.ragService;
        persistDir = setup.persistDir;
    }, 30000);

    afterAll(async () => {
        await cleanupTempChromaDir(persistDir);
    });

    test('health restituisce ok', async () => {
        const health = await ragService.health();
        expect(health.status).toBe('ok');
    }, 10000);

    test('query su collezione vuota restituisce array vuoto', async () => {
        const result = await ragService.query('test_collection', 'query', null, 3);
        expect(result.documents).toEqual([]);
        expect(result.count).toBe(0);
    }, 10000);

    test('ingest e query restituiscono documenti', async () => {
        const docs = [{ text: 'Questo è un documento di prova', metadata: { test: true } }];
        const ingestResult = await ragService.ingest('test_collection', docs);
        expect(ingestResult.indexed).toBe(1);
        const queryResult = await ragService.query('test_collection', 'prova', null, 3);
        expect(queryResult.count).toBeGreaterThan(0);
        expect(queryResult.documents[0]).toContain('documento di prova');
    }, 20000);

    test('query arricchita con tassonomia', async () => {
        const taxonomy = { categories: [{ name: 'Process' }, { name: 'Data Store' }] };
        const result = await ragService.query('test_collection', 'database', taxonomy, 3);
        expect(result).toHaveProperty('documents');
    }, 10000);
});