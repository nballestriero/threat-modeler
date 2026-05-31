/**
 * @file Test di integrazione per isolamento asset/flows con projectDir
 * @description Verifica che CRUD asset e flussi operino nella directory corretta del progetto attivo.
 * @module tests/integration/assets-with-projects
 * 
 * @jest-environment node
 */

const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

const app = require('../../server');

const TEST_DATA_DIR = path.join(__dirname, '../../data-test-isolation');
const TEST_PROJECTS_FILE = path.join(TEST_DATA_DIR, 'projects.json');

process.env.DATA_DIR = TEST_DATA_DIR;

beforeAll(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.writeFile(TEST_PROJECTS_FILE, JSON.stringify([], null, 2));
    jest.resetModules();
});

afterEach(async () => {
    await fs.writeFile(TEST_PROJECTS_FILE, JSON.stringify([], null, 2));
    const entries = await fs.readdir(TEST_DATA_DIR, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.match(/^[0-9a-f-]+$/i)) {
            await fs.rm(path.join(TEST_DATA_DIR, entry.name), { recursive: true, force: true });
        }
    }
});

afterAll(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    delete process.env.DATA_DIR;
});

describe('Asset/Flow CRUD con isolamento projectDir', () => {

    test('Cascade delete: eliminando asset in un progetto, i flussi orfani vengono rimossi solo in quel progetto', async () => {
        // Crea due progetti
        const projectA = await request(app).post('/api/projects').send({ name: 'Proj A' }).expect(201);
        const projectB = await request(app).post('/api/projects').send({ name: 'Proj B' }).expect(201);

        // Configura Progetto A: crea asset e flusso correlato
        await request(app).post(`/api/projects/${projectA.body.id}/status`).send({ status: 'active' }).expect(200);

        const assetA = await request(app)
            .post('/api/assets')
            .send({ name: 'Asset A', category: 'Process' })
            .expect(201);

        await request(app)
            .post('/api/flows')
            .send({ fromId: assetA.body.id, toId: 'other', label: 'Flusso A' })
            .expect(201);

        // Configura Progetto B: crea asset e flusso con stesso ID fittizio (ma isolato)
        await request(app).post(`/api/projects/${projectB.body.id}/status`).send({ status: 'active' }).expect(200);

        const assetB = await request(app)
            .post('/api/assets')
            .send({ name: 'Asset B', category: 'Process' })
            .expect(201);

        await request(app)
            .post('/api/flows')
            .send({ fromId: assetB.body.id, toId: 'other', label: 'Flusso B' })
            .expect(201);

        // Elimina asset in Progetto A (dovrebbe rimuovere solo il flusso di A)
        await request(app).post(`/api/projects/${projectA.body.id}/status`).send({ status: 'active' }).expect(200);
        await request(app).delete(`/api/assets/${assetA.body.id}`).expect(200);

        // Verifica in Progetto A: asset e flusso eliminati
        const assetsA = await request(app).get('/api/assets').expect(200);
        const flowsA = await request(app).get('/api/flows').expect(200);
        expect(assetsA.body.find(a => a.id === assetA.body.id)).toBeUndefined();
        expect(flowsA.body.find(f => f.label === 'Flusso A')).toBeUndefined();

        // Verifica in Progetto B: asset e flusso ancora presenti
        await request(app).post(`/api/projects/${projectB.body.id}/status`).send({ status: 'active' }).expect(200);
        const assetsB = await request(app).get('/api/assets').expect(200);
        const flowsB = await request(app).get('/api/flows').expect(200);
        expect(assetsB.body.find(a => a.id === assetB.body.id)).toBeDefined();
        expect(flowsB.body.find(f => f.label === 'Flusso B')).toBeDefined();
    });

    test('ImportAssets opera solo nel progetto attivo', async () => {
        const projectA = await request(app).post('/api/projects').send({ name: 'Import A' }).expect(201);
        const projectB = await request(app).post('/api/projects').send({ name: 'Import B' }).expect(201);

        // Importa in Progetto A
        await request(app).post(`/api/projects/${projectA.body.id}/status`).send({ status: 'active' }).expect(200);
        await request(app)
            .post('/api/assets/import')
            .send({ assets: [{ name: 'Imported A', category: 'Process' }] })
            .expect(200);

        // Importa in Progetto B
        await request(app).post(`/api/projects/${projectB.body.id}/status`).send({ status: 'active' }).expect(200);
        await request(app)
            .post('/api/assets/import')
            .send({ assets: [{ name: 'Imported B', category: 'Data Store' }] })
            .expect(200);

        // Verifica isolamento
        await request(app).post(`/api/projects/${projectA.body.id}/status`).send({ status: 'active' }).expect(200);
        const assetsA = await request(app).get('/api/assets').expect(200);
        expect(assetsA.body.find(a => a.name === 'Imported A')).toBeDefined();
        expect(assetsA.body.find(a => a.name === 'Imported B')).toBeUndefined();

        await request(app).post(`/api/projects/${projectB.body.id}/status`).send({ status: 'active' }).expect(200);
        const assetsB = await request(app).get('/api/assets').expect(200);
        expect(assetsB.body.find(a => a.name === 'Imported B')).toBeDefined();
        expect(assetsB.body.find(a => a.name === 'Imported A')).toBeUndefined();
    });
});