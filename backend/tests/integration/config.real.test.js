// tests/integration/config.real.test.js
const request = require('supertest');
const app = require('../../server');
const path = require('path');
const fs = require('fs').promises;
const { CONFIG_FILE } = require('../../utils/configUtils');

describe('Configurazione reale', () => {
    let backupConfig;

    beforeAll(async () => {
        // Backup del config.json originale
        try {
            backupConfig = await fs.readFile(CONFIG_FILE, 'utf-8');
        } catch (e) { /* non esiste */ }
    });

    afterAll(async () => {
        // Ripristina configurazione originale
        if (backupConfig) {
            await fs.writeFile(CONFIG_FILE, backupConfig);
        }
    });

    test('GET /api/config restituisce oggetto valido', async () => {
        const res = await request(app).get('/api/config').expect(200);
        expect(res.body).toHaveProperty('ollama');
        expect(res.body).toHaveProperty('rag');
    });

    test('PUT /api/config con campi validi aggiorna la configurazione', async () => {
        const updates = {
            rag: {
                enabled: true,
                mode: 'python-client',
                pythonBridge: { scriptPath: './services/rag_bridge.py' }
            }
        };
        await request(app).put('/api/config').send(updates).expect(200);
        const getRes = await request(app).get('/api/config').expect(200);
        expect(getRes.body.rag.enabled).toBe(true);
        expect(getRes.body.rag.pythonBridge.scriptPath).toBe('./services/rag_bridge.py');
    });

    test('PUT /api/config con configurazione non valida restituisce errore', async () => {
        const invalid = { rag: { enabled: true, mode: 'unknown' } };
        const res = await request(app).put('/api/config').send(invalid).expect(400);
        expect(res.body.error).toContain('rag.mode deve essere');
    });
});