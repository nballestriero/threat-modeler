const request = require('supertest');
const path = require('path');
const app = require('../../server');
const { saveModel } = require('../../models/assetModel');
const ollamaService = require('../../services/ollamaService');
const textExtractor = require('../../services/textExtractorService');

jest.mock('../../services/ollamaService', () => ({
    callOllama: jest.fn()
}));

describe('Estrazione asset da file reale (mock Ollama)', () => {
    const fixturesDir = path.join(__dirname, '../fixtures');
    let testFilePath;

    beforeAll(async () => {
        const fs = require('fs');
        const pdfPath = path.join(fixturesDir, 'sample.pdf');
        const txtPath = path.join(fixturesDir, 'sample_long.txt');
        if (fs.existsSync(pdfPath)) testFilePath = pdfPath;
        else if (fs.existsSync(txtPath)) testFilePath = txtPath;
        else {
            const tempTxt = path.join(fixturesDir, 'temp_sample.txt');
            fs.writeFileSync(tempTxt, 'Questo documento contiene server e database.');
            testFilePath = tempTxt;
        }
        await saveModel({ assets: [], flows: [] });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        const mockAssets = JSON.stringify([
            { name: "Server API", category: "Process", description: "Gestisce le richieste" },
            { name: "Database Utenti", category: "Data Store", description: "Archivia i dati" }
        ]);
        ollamaService.callOllama.mockResolvedValue(mockAssets);
    });

    test('POST /api/analyze/extract-assets con file reale restituisce asset e chiama Ollama', async () => {
        const res = await request(app)
            .post('/api/analyze/extract-assets')
            .send({
                files: [testFilePath],
                methodology: 'dfd-base',
                options: { useChunking: false, useRag: false }
            })
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.assets.length).toBeGreaterThan(0);
        expect(ollamaService.callOllama).toHaveBeenCalled();
    }, 20000);

    test('POST /api/analyze/extract-assets con chunking attivo chiama Ollama per ogni chunk', async () => {
        const longFilePath = path.join(fixturesDir, 'sample_long.txt');
        const fs = require('fs');
        if (!fs.existsSync(longFilePath)) {
            console.warn('⚠️ sample_long.txt non trovato, skip test chunking');
            return;
        }
        const res = await request(app)
            .post('/api/analyze/extract-assets')
            .send({
                files: [longFilePath],
                methodology: 'dfd-base',
                options: { useChunking: true, maxChunkSize: 300, chunkOverlap: 50, useRag: false }
            })
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.chunksProcessed).toBeGreaterThan(1);
        expect(ollamaService.callOllama).toHaveBeenCalledTimes(res.body.chunksProcessed);
    }, 20000);
});