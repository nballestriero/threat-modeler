/**
 * @file Test di integrazione per le API REST di asset e flussi
 * @description Verifica il flusso completo HTTP: richiesta → controller → service → model → risposta.
 *              I test operano su un file JSON isolato (threat-model.test.json) per non interferire 
 *              con i dati di produzione. Include test CRUD, validazione input e gestione errori HTTP.
 * @module tests/integration/assets.integration
 * 
 * @jest-environment node
 * 
 * @see {@link ../../server.js} Entry point Express (esportato senza listen)
 * @see {@link ../../services/assetService.js} Business logic per asset
 * @see {@link ../../models/assetModel.js} Persistenza JSON
 */

// ============================================================================
// IMPORT E CONFIGURAZIONE
// ============================================================================

const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Importa l'app Express senza avviare il server (già esportato da server.js)
const app = require('../../server');

// Path per un file JSON di test isolato (non tocca threat-model.json reale)
const TEST_JSON_FILE = path.join(__dirname, '../../threat-model.test.json');

// Variabile d'ambiente per far puntare assetModel al file di test
process.env.TEST_JSON_FILE = TEST_JSON_FILE;

// ============================================================================
// DATI DI TEST RIUTILIZZABILI
// ============================================================================

/** @type {Object} Payload valido per creazione asset */
const VALID_ASSET_PAYLOAD = {
    name: 'Integration Test Asset',
    category: 'External Entity',
    description: 'Creato automaticamente dal test di integrazione'
};

/** @type {Object} Payload valido per creazione flusso */
const VALID_FLOW_PAYLOAD = {
    fromId: 'source-123',
    toId: 'target-456',
    label: 'HTTPS Request',
    description: 'Flusso di test'
};

/** @type {string|null} ID generato dinamicamente durante i test */
let createdAssetId = null;
let createdFlowId = null;

// ============================================================================
// SETUP E TEARDOWN (isolamento dati completo)
// ============================================================================

beforeAll(async () => {
    jest.resetModules();
    await fs.writeFile(TEST_JSON_FILE, JSON.stringify({ assets: [], flows: [] }, null, 2), 'utf-8');
});

beforeEach(async () => {
    jest.resetModules();
    await fs.writeFile(TEST_JSON_FILE, JSON.stringify({ assets: [], flows: [] }, null, 2), 'utf-8');
    createdAssetId = null;
    createdFlowId = null;
});

afterEach(() => {
    createdAssetId = null;
    createdFlowId = null;
});

afterAll(async () => {
    try {
        await fs.unlink(TEST_JSON_FILE);
    } catch (err) { }
    delete process.env.TEST_JSON_FILE;
});

// ============================================================================
// TEST SU ASSETS API (CRUD completo)
// ============================================================================

describe('Assets API - Integrazione HTTP', () => {

    test('POST /api/assets crea un nuovo asset e restituisce 201', async () => {
        const res = await request(app)
            .post('/api/assets')
            .send(VALID_ASSET_PAYLOAD)
            .expect('Content-Type', /json/)
            .expect(201);

        expect(res.body).toMatchObject({
            name: VALID_ASSET_PAYLOAD.name,
            category: VALID_ASSET_PAYLOAD.category
        });
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('createdAt');
        createdAssetId = res.body.id;
    });

    test('POST /api/assets restituisce 400 se name è mancante', async () => {
        const res = await request(app)
            .post('/api/assets')
            .send({ category: 'Process' })
            .expect('Content-Type', /json/)
            .expect(400);

        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('name');
    });

    test('GET /api/assets restituisce array con gli asset creati', async () => {
        const createRes = await request(app)
            .post('/api/assets')
            .send(VALID_ASSET_PAYLOAD)
            .expect(201);
        const testAssetId = createRes.body.id;

        const res = await request(app)
            .get('/api/assets')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        const found = res.body.find(a => a.id === testAssetId);
        expect(found).toBeDefined();
        expect(found.name).toBe(VALID_ASSET_PAYLOAD.name);
    });

    test('PUT /api/assets/:id aggiorna solo i campi specificati', async () => {
        const createRes = await request(app)
            .post('/api/assets')
            .send(VALID_ASSET_PAYLOAD)
            .expect(201);
        const testAssetId = createRes.body.id;

        const updates = {
            name: 'Asset Aggiornato via Test',
            description: 'Nuova descrizione di test'
        };

        const res = await request(app)
            .put(`/api/assets/${testAssetId}`)
            .send(updates)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.name).toBe(updates.name);
        expect(res.body.description).toBe(updates.description);
        expect(res.body.category).toBe(VALID_ASSET_PAYLOAD.category);
        expect(res.body.id).toBe(testAssetId);
    });

    test('PUT /api/assets/:id restituisce 404 se l\'asset non esiste', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
            .put(`/api/assets/${fakeId}`)
            .send({ name: 'Test' })
            .expect('Content-Type', /json/)
            .expect(404);

        expect(res.body).toHaveProperty('error');
    });

    test('DELETE /api/assets/:id elimina l\'asset e restituisce successo', async () => {
        const createRes = await request(app)
            .post('/api/assets')
            .send(VALID_ASSET_PAYLOAD)
            .expect(201);
        const testAssetId = createRes.body.id;

        const before = await request(app).get('/api/assets');
        expect(before.body.some(a => a.id === testAssetId)).toBe(true);

        const deleteRes = await request(app)
            .delete(`/api/assets/${testAssetId}`)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(deleteRes.body).toHaveProperty('success', true);

        const after = await request(app).get('/api/assets');
        const found = after.body.find(a => a.id === testAssetId);
        expect(found).toBeUndefined();
    });
});

// ============================================================================
// TEST SU FLOWS API (CRUD completo)
// ============================================================================

describe('Flows API - Integrazione HTTP', () => {

    beforeEach(async () => {
        const sourceRes = await request(app)
            .post('/api/assets')
            .send({ name: 'Source Asset', category: 'External Entity' });
        const targetRes = await request(app)
            .post('/api/assets')
            .send({ name: 'Target Asset', category: 'Data Store' });

        VALID_FLOW_PAYLOAD.fromId = sourceRes.body.id;
        VALID_FLOW_PAYLOAD.toId = targetRes.body.id;
    });

    test('POST /api/flows crea un nuovo flusso e restituisce 201', async () => {
        const res = await request(app)
            .post('/api/flows')
            .send(VALID_FLOW_PAYLOAD)
            .expect('Content-Type', /json/)
            .expect(201);

        expect(res.body).toMatchObject({
            fromId: VALID_FLOW_PAYLOAD.fromId,
            toId: VALID_FLOW_PAYLOAD.toId,
            label: VALID_FLOW_PAYLOAD.label
        });
        expect(res.body).toHaveProperty('id');
        createdFlowId = res.body.id;
    });

    /**
     * ✅ TEST AGGIORNATO: Ora il backend valida fromId/toId → ci aspettiamo 400
     */
    test('POST /api/flows restituisce 400 se fromId o toId sono mancanti', async () => {
        // Test: manca fromId → dovrebbe restituire 400
        await request(app)
            .post('/api/flows')
            .send({ toId: 'target', label: 'Test' })
            .expect('Content-Type', /json/)
            .expect(400);

        // Test: manca toId → dovrebbe restituire 400
        await request(app)
            .post('/api/flows')
            .send({ fromId: 'source', label: 'Test' })
            .expect('Content-Type', /json/)
            .expect(400);
    });

    test('GET /api/flows restituisce array con i flussi creati', async () => {
        const createRes = await request(app)
            .post('/api/flows')
            .send(VALID_FLOW_PAYLOAD)
            .expect(201);
        const testFlowId = createRes.body.id;

        const res = await request(app)
            .get('/api/flows')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        const found = res.body.find(f => f.id === testFlowId);
        expect(found).toBeDefined();
        expect(found.label).toBe(VALID_FLOW_PAYLOAD.label);
    });

    test('PUT /api/flows/:id aggiorna solo i campi specificati', async () => {
        const createRes = await request(app)
            .post('/api/flows')
            .send(VALID_FLOW_PAYLOAD)
            .expect(201);
        const testFlowId = createRes.body.id;

        const updates = {
            label: 'Flusso Aggiornato',
            description: 'Nuova descrizione'
        };

        const res = await request(app)
            .put(`/api/flows/${testFlowId}`)
            .send(updates)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body.label).toBe(updates.label);
        expect(res.body.fromId).toBe(VALID_FLOW_PAYLOAD.fromId);
    });

    test('DELETE /api/flows/:id elimina il flusso e restituisce successo', async () => {
        const createRes = await request(app)
            .post('/api/flows')
            .send(VALID_FLOW_PAYLOAD)
            .expect(201);
        const testFlowId = createRes.body.id;

        const before = await request(app).get('/api/flows');
        expect(before.body.some(f => f.id === testFlowId)).toBe(true);

        const deleteRes = await request(app)
            .delete(`/api/flows/${testFlowId}`)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(deleteRes.body).toHaveProperty('success', true);

        const after = await request(app).get('/api/flows');
        const found = after.body.find(f => f.id === testFlowId);
        expect(found).toBeUndefined();
    });
});

// ============================================================================
// TEST SU SCENARI COMPLESSI E EDGE CASE
// ============================================================================

describe('Assets & Flows API - Scenari complessi', () => {

    test('Eliminando un asset, i flussi correlati rimangono (orfani) - comportamento attuale', async () => {
        const assetRes = await request(app)
            .post('/api/assets')
            .send({ name: 'Asset da eliminare', category: 'Process' });
        const assetId = assetRes.body.id;

        const flowRes = await request(app)
            .post('/api/flows')
            .send({
                fromId: assetId,
                toId: 'other-123',
                label: 'Flusso verso asset eliminato'
            });
        const flowId = flowRes.body.id;

        await request(app).delete(`/api/assets/${assetId}`).expect(200);

        const flowsRes = await request(app).get('/api/flows');
        const orphanFlow = flowsRes.body.find(f => f.id === flowId);
        expect(orphanFlow).toBeDefined();

        await request(app).delete(`/api/flows/${flowId}`);
    });

    test('Endpoint inesistente restituisce 404', async () => {
        await request(app)
            .get('/api/endpoint-inesistente')
            .expect(404);
    });

    test('Middleware CORS aggiunge header appropriati', async () => {
        const res = await request(app).get('/api/assets');
        expect(res.headers).toHaveProperty('access-control-allow-origin', '*');
    });
});