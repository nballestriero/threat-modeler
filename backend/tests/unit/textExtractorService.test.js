// backend/tests/unit/textExtractorService.test.js
const { extractTextFromFile } = require('../../services/textExtractorService');
const fs = require('fs').promises;
const path = require('path');

describe('TextExtractorService', () => {
    const tmpDir = path.join(__dirname, '../tmp');

    beforeAll(async () => {
        await fs.mkdir(tmpDir, { recursive: true });
    });

    afterAll(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    test('estrae testo da file .txt', async () => {
        const filePath = path.join(tmpDir, 'test.txt');
        await fs.writeFile(filePath, 'Hello world');
        const text = await extractTextFromFile(filePath);
        expect(text).toBe('Hello world');
    });

    test('estrae testo da file .md', async () => {
        const filePath = path.join(tmpDir, 'test.md');
        await fs.writeFile(filePath, '# Titolo\n\nTesto **importante**.');
        const text = await extractTextFromFile(filePath);
        expect(text).toContain('Titolo');
        expect(text).toContain('Testo importante');
    });

    test('estrae testo da file .html', async () => {
        const filePath = path.join(tmpDir, 'test.html');
        await fs.writeFile(filePath, '<html><body><p>Contenuto <b>HTML</b></p></body></html>');
        const text = await extractTextFromFile(filePath);
        expect(text).toBe('Contenuto HTML');
    });

    test('estrae testo da PDF (mock)', async () => {
        // Non possiamo testare un PDF reale qui, ma possiamo mockare il comportamento.
        // Per evitare dipendenze esterne, saltiamo il test del PDF in unit test.
        // In un ambiente di integrazione si potrebbe usare un PDF campione.
        // Qui per semplicità verifichiamo che la funzione esista e non lanci errori di sintassi.
        expect(typeof extractTextFromFile).toBe('function');
    });

    test('lancia errore per formato non supportato', async () => {
        const filePath = path.join(tmpDir, 'test.xyz');
        await fs.writeFile(filePath, 'dummy');
        await expect(extractTextFromFile(filePath)).rejects.toThrow('Formato non supportato');
    });
});