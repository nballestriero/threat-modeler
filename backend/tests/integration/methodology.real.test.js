// tests/integration/methodology.real.test.js
const methodologyService = require('../../services/methodologyService');

describe('Metodologie con tassonomia mancante', () => {
    test('loadTaxonomy lancia errore per metodologia senza taxonomy.json', async () => {
        await expect(methodologyService.loadTaxonomy('stride-ai')).rejects.toThrow();
    });

    test('buildExtractionPrompt fallisce graceful se tassonomia mancante', async () => {
        await expect(methodologyService.buildExtractionPrompt('stride-ai', 'testo')).rejects.toThrow();
    });
});