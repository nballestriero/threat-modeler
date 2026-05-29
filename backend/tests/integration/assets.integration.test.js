const request = require('supertest');
const app = require('../../server'); // esportiamo app da server.js senza ascolto

describe('Assets API', () => {
    let createdAssetId;

    test('POST /api/assets crea un asset', async () => {
        const res = await request(app)
            .post('/api/assets')
            .send({ name: 'Integration Test', category: 'External Entity' })
            .expect(201);
        expect(res.body).toHaveProperty('id');
        createdAssetId = res.body.id;
    });

    test('GET /api/assets restituisce array', async () => {
        const res = await request(app).get('/api/assets').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('PUT /api/assets/:id aggiorna', async () => {
        const res = await request(app)
            .put(`/api/assets/${createdAssetId}`)
            .send({ name: 'Aggiornato via test' })
            .expect(200);
        expect(res.body.name).toBe('Aggiornato via test');
    });

    test('DELETE /api/assets/:id elimina', async () => {
        await request(app).delete(`/api/assets/${createdAssetId}`).expect(200);
        // Verifica che non esiste più
        const getRes = await request(app).get('/api/assets');
        const found = getRes.body.find(a => a.id === createdAssetId);
        expect(found).toBeUndefined();
    });
});

describe('Flows API', () => {
    let createdFlowId;

    test('POST /api/flows crea un flusso', async () => {
        const res = await request(app)
            .post('/api/flows')
            .send({ name: 'Test Flow', source: 'User', target: 'Database' })
            .expect(201);
        expect(res.body).toHaveProperty('id');
        createdFlowId = res.body.id;
    });

    test('GET /api/flows restituisce array', async () => {
        const res = await request(app).get('/api/flows').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('PUT /api/flows/:id aggiorna', async () => {
        const res = await request(app)
            .put(`/api/flows/${createdFlowId}`)
            .send({ description: 'Aggiornato' })
            .expect(200);
        expect(res.body.description).toBe('Aggiornato');
    });

    test('DELETE /api/flows/:id elimina', async () => {
        await request(app).delete(`/api/flows/${createdFlowId}`).expect(200);
        const getRes = await request(app).get('/api/flows');
        const found = getRes.body.find(f => f.id === createdFlowId);
        expect(found).toBeUndefined();
    });
});