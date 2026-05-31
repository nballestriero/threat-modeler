/**
 * @file Test di integrazione per la gestione progetti
 * @description Verifica CRUD progetti, auto-attivazione, isolamento cartelle e persistenza.
 * @module tests/integration/projects.integration
 * 
 * @jest-environment node
 * 
 * @see {@link ../../services/projectService.js} Servizio gestito
 * @see {@link ../../middleware/projectScope.js} Middleware testato indirettamente
 */

// ============================================================================
// ⚠️ IMPORTANTE: Imposta DATA_DIR PRIMA di qualsiasi require!
// ============================================================================

/**
 * Directory e file di test isolati (NON toccano i dati reali di produzione).
 * Deve essere impostato PRIMA di importare server.js, altrimenti il middleware
 * userà il valore originale di DATA_DIR.
 */
const TEST_DATA_DIR = require('path').join(__dirname, '../../data-test-projects');
process.env.DATA_DIR = TEST_DATA_DIR; // ✅ Imposta PRIMA di require server

// Ora possiamo importare i moduli che usano DATA_DIR
const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../../server'); // ✅ Ora server.js vedrà DATA_DIR corretto

// ============================================================================
// SETUP E TEARDOWN GLOBALI
// ============================================================================

/**
 * Prima di tutta la suite: pulisci e inizializza directory di test.
 */
beforeAll(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(TEST_DATA_DIR, 'projects.json'),
        JSON.stringify([], null, 2),
        'utf-8'
    );
    jest.resetModules();
});

/**
 * Dopo ogni test: resetta projects.json per isolamento tra test.
 */
afterEach(async () => {
    await fs.writeFile(
        path.join(TEST_DATA_DIR, 'projects.json'),
        JSON.stringify([], null, 2),
        'utf-8'
    );

    try {
        const entries = await fs.readdir(TEST_DATA_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.match(/^[0-9a-f-]+$/i)) {
                await fs.rm(path.join(TEST_DATA_DIR, entry.name), {
                    recursive: true,
                    force: true
                });
            }
        }
    } catch (err) {
        // Ignora se la directory non esiste o è vuota
    }
});

/**
 * Dopo tutta la suite: rimuovi directory di test per cleanup finale.
 */
afterAll(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    delete process.env.DATA_DIR;
});

// ============================================================================
// HELPER: waitForDirectory con retry e log per debug
// ============================================================================

/**
 * Helper: attende che una directory esista con retry e log per debug.
 * Utile per test su Windows o dischi lenti dove la creazione async può essere ritardata.
 * @param {string} dirPath - Percorso della directory da attendere
 * @param {number} maxAttempts - Numero massimo di tentativi (default: 15)
 * @param {number} delayMs - Delay tra i tentativi in ms (default: 300)
 * @returns {Promise<boolean>} true se la directory è stata trovata, false altrimenti
 */
async function waitForDirectory(dirPath, maxAttempts = 15, delayMs = 300) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const stats = await fs.stat(dirPath);
            if (stats.isDirectory()) {
                console.log(`✅ Directory trovata dopo ${i + 1} tentativi: ${dirPath}`);
                return true;
            }
        } catch (err) {
            // Directory non esiste ancora, aspetta e riprova
            console.log(`⏳ Tentativo ${i + 1}/${maxAttempts}: directory non ancora creata: ${dirPath}`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Debug: lista cosa c'è nella directory genitore se fallisce
    console.error(`❌ Directory non trovata dopo ${maxAttempts} tentativi: ${dirPath}`);
    try {
        const parentDir = path.dirname(dirPath);
        const entries = await fs.readdir(parentDir, { withFileTypes: true });
        console.log(`📁 Contenuto di ${parentDir}:`, entries.map(e => e.name));
    } catch (e) {
        console.error(`❌ Impossibile leggere directory genitore: ${e.message}`);
    }

    return false;
}

// ============================================================================
// TEST CRUD PROGETTI
// ============================================================================

describe('Projects API - CRUD e auto-attivazione', () => {

    test('POST /api/projects crea un progetto e lo imposta automaticamente come attivo', async () => {
        const projectData = {
            name: 'Test Progetto Alpha',
            description: 'Progetto di test per isolamento dati',
            owner: 'Test User'
        };

        const res = await request(app)
            .post('/api/projects')
            .send(projectData)
            .expect('Content-Type', /json/)
            .expect(201);

        expect(res.body).toMatchObject({
            name: projectData.name,
            description: projectData.description,
            owner: projectData.owner,
            status: 'active'
        });
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('createdAt');
        expect(res.body).toHaveProperty('updatedAt');

        const listRes = await request(app).get('/api/projects').expect(200);
        const activeProjects = listRes.body.filter(p => p.status === 'active');
        expect(activeProjects).toHaveLength(1);
        expect(activeProjects[0].id).toBe(res.body.id);
    });

    test('POST /api/projects disattiva eventuali progetti attivi preesistenti', async () => {
        const project1 = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto 1' })
            .expect(201);

        const project2 = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto 2' })
            .expect(201);

        const listRes = await request(app).get('/api/projects').expect(200);
        const activeProjects = listRes.body.filter(p => p.status === 'active');

        expect(activeProjects).toHaveLength(1);
        expect(activeProjects[0].id).toBe(project2.body.id);

        const project1Updated = listRes.body.find(p => p.id === project1.body.id);
        expect(project1Updated.status).toBe('draft');
    });

    test('GET /api/projects restituisce lista progetti', async () => {
        await request(app).post('/api/projects').send({ name: 'Zeta' }).expect(201);
        await request(app).post('/api/projects').send({ name: 'Alpha' }).expect(201);

        const res = await request(app).get('/api/projects').expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);

        const names = res.body.map(p => p.name);
        expect(names).toContain('Zeta');
        expect(names).toContain('Alpha');
    });

    test('PUT /api/projects/:id aggiorna metadati senza modificare status o id', async () => {
        const createRes = await request(app)
            .post('/api/projects')
            .send({ name: 'Originale', status: 'active' })
            .expect(201);
        const projectId = createRes.body.id;

        const updates = {
            name: 'Aggiornato',
            description: 'Nuova descrizione',
            status: 'archived'
        };

        const res = await request(app)
            .put(`/api/projects/${projectId}`)
            .send(updates)
            .expect(200);

        expect(res.body.name).toBe('Aggiornato');
        expect(res.body.description).toBe('Nuova descrizione');
        expect(res.body.status).toBe('active');
        expect(res.body.id).toBe(projectId);
    });

    test('POST /api/projects/:id/status cambia stato progetto', async () => {
        const createRes = await request(app)
            .post('/api/projects')
            .send({ name: 'Test Status' })
            .expect(201);
        const projectId = createRes.body.id;

        const archiveRes = await request(app)
            .post(`/api/projects/${projectId}/status`)
            .send({ status: 'archived' })
            .expect(200);
        expect(archiveRes.body.status).toBe('archived');

        const draftRes = await request(app)
            .post(`/api/projects/${projectId}/status`)
            .send({ status: 'draft' })
            .expect(200);
        expect(draftRes.body.status).toBe('draft');
    });

    test('POST /api/projects/:id/status con stato non valido restituisce 400', async () => {
        const createRes = await request(app)
            .post('/api/projects')
            .send({ name: 'Test' })
            .expect(201);

        await request(app)
            .post(`/api/projects/${createRes.body.id}/status`)
            .send({ status: 'invalid-status' })
            .expect(400);
    });

    test('PUT/POST su progetto inesistente restituisce 404', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';

        await request(app)
            .put(`/api/projects/${fakeId}`)
            .send({ name: 'Test' })
            .expect(404);

        await request(app)
            .post(`/api/projects/${fakeId}/status`)
            .send({ status: 'active' })
            .expect(404);
    });
});

// ============================================================================
// TEST ISOLAMENTO CARTELLE PROGETTO
// ============================================================================

describe('Projects API - Isolamento cartelle e file', () => {

    test('Creazione progetto genera directory isolata con threat-model.json vuoto', async () => {
        const projectRes = await request(app)
            .post('/api/projects')
            .send({ name: 'Test Isolamento' })
            .expect(201);

        const projectDir = path.join(TEST_DATA_DIR, projectRes.body.id);
        const tmFile = path.join(projectDir, 'threat-model.json');
        const cfgFile = path.join(projectDir, 'config.json');

        // ✅ Retry loop con log per debug: attendi che la directory sia creata (fino a 4.5 secondi)
        const dirExists = await waitForDirectory(projectDir, 15, 300);
        expect(dirExists).toBe(true);

        // Verifica che threat-model.json esista e sia valido
        const tmContent = await fs.readFile(tmFile, 'utf-8');
        const tmParsed = JSON.parse(tmContent);
        expect(tmParsed).toHaveProperty('assets');
        expect(tmParsed).toHaveProperty('flows');
        expect(tmParsed.assets).toEqual([]);
        expect(tmParsed.flows).toEqual([]);

        // Verifica che config.json esista
        const cfgExists = await fs.access(cfgFile).then(() => true).catch(() => false);
        expect(cfgExists).toBe(true);
    });

    test('Asset creati in un progetto non appaiono in un altro progetto', async () => {
        const projectA = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto A' })
            .expect(201);

        const projectB = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto B' })
            .expect(201);

        await request(app)
            .post(`/api/projects/${projectA.body.id}/status`)
            .send({ status: 'active' })
            .expect(200);

        await request(app)
            .post('/api/assets')
            .send({ name: 'Asset Solo A', category: 'Process' })
            .expect(201);

        await request(app)
            .post(`/api/projects/${projectB.body.id}/status`)
            .send({ status: 'active' })
            .expect(200);

        const assetsB = await request(app).get('/api/assets').expect(200);
        const foundInB = assetsB.body.find(a => a.name === 'Asset Solo A');
        expect(foundInB).toBeUndefined();

        await request(app)
            .post(`/api/projects/${projectA.body.id}/status`)
            .send({ status: 'active' })
            .expect(200);

        const assetsA = await request(app).get('/api/assets').expect(200);
        const foundInA = assetsA.body.find(a => a.name === 'Asset Solo A');
        expect(foundInA).toBeDefined();
        expect(foundInA.name).toBe('Asset Solo A');
    });

    test('Flussi creati in un progetto non appaiono in un altro progetto', async () => {
        const projectA = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto Flussi A' })
            .expect(201);

        const projectB = await request(app)
            .post('/api/projects')
            .send({ name: 'Progetto Flussi B' })
            .expect(201);

        await request(app)
            .post(`/api/projects/${projectA.body.id}/status`)
            .send({ status: 'active' })
            .expect(200);

        const assetA = await request(app)
            .post('/api/assets')
            .send({ name: 'Source A', category: 'Process' })
            .expect(201);

        await request(app)
            .post('/api/flows')
            .send({
                fromId: assetA.body.id,
                toId: 'target-dummy',
                label: 'Flusso Solo A'
            })
            .expect(201);

        await request(app)
            .post(`/api/projects/${projectB.body.id}/status`)
            .send({ status: 'active' })
            .expect(200);

        const flowsB = await request(app).get('/api/flows').expect(200);
        const foundInB = flowsB.body.find(f => f.label === 'Flusso Solo A');
        expect(foundInB).toBeUndefined();
    });
});

// ============================================================================
// TEST MIDDLEWARE PROJECTSCOPE
// ============================================================================

describe('Middleware projectScope - Risoluzione directory', () => {

    test('Richiesta con progetto attivo inietta req.projectDir corretto', async () => {
        const project = await request(app)
            .post('/api/projects')
            .send({ name: 'Test Middleware' })
            .expect(201);

        const res = await request(app).get('/api/assets').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('Richiesta senza progetto attivo usa fallback directory', async () => {
        await fs.writeFile(
            path.join(TEST_DATA_DIR, 'projects.json'),
            JSON.stringify([], null, 2)
        );

        const res = await request(app).get('/api/assets').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});