// backend/tests/integration/server.integration.test.js
const request = require('supertest');
const app = require('../../server');

describe('Server Integration', () => {
    test('GET /api/methodologies restituisce lista metodologie', async () => {
        const res = await request(app).get('/api/methodologies').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/config restituisce configurazione', async () => {
        const res = await request(app).get('/api/config').expect(200);
        expect(res.body).toHaveProperty('ollama');
        expect(res.body).toHaveProperty('rag');
    });

    test('POST /api/analyze/extract-assets - validazione input', async () => {
        const res = await request(app)
            .post('/api/analyze/extract-assets')
            .send({})
            .expect(400);
        expect(res.body.error).toContain('files array è obbligatorio');
    });

    test('POST /api/analyze/extract-assets con file inesistente', async () => {
        const res = await request(app)
            .post('/api/analyze/extract-assets')
            .send({
                files: ['/path/invalido.pdf'],
                methodology: 'dfd-base',
                options: { useChunking: false, useRag: false }
            })
            .expect(500);
        expect(res.body.error).toBeDefined();
    });

    test('app.locals.config è stato caricato', () => {
        expect(app.locals.config).toBeDefined();
        expect(app.locals.config.ollama).toBeDefined();
    });
});