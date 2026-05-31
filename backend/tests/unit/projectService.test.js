/**
 * @file Test unitari per projectService.js
 * @description Verifica logica CRUD progetti con mock del filesystem.
 * @module tests/unit/projectService.test
 * 
 * @jest-environment node
 * 
 * @see {@link ../../services/projectService.js} Service testato
 */

// ============================================================================
// MOCK DI fs.promises (DEVE ESSERE PRIMA DI QUALSIASI IMPORT)
// ============================================================================

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        promises: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            mkdir: jest.fn(),
            access: jest.fn(),
            stat: jest.fn(),
            readdir: jest.fn(),
            rm: jest.fn()
        }
    };
});

// ============================================================================
// IMPORT DOPO IL MOCK
// ============================================================================

const fs = require('fs');
const path = require('path');
const projectService = require('../../services/projectService');

// ============================================================================
// SETUP E TEARDOWN
// ============================================================================

beforeEach(() => {
    jest.clearAllMocks();
    fs.promises.readFile.mockResolvedValue(JSON.stringify([]));
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.writeFile.mockResolvedValue();
    fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
});

// ============================================================================
// TEST: getAllProjects
// ============================================================================

describe('projectService - getAllProjects', () => {

    test('restituisce array vuoto se file non esiste', async () => {
        fs.promises.readFile.mockRejectedValue({ code: 'ENOENT' });
        const result = await projectService.getAllProjects();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    test('restituisce array vuoto se JSON è corrotto', async () => {
        fs.promises.readFile.mockResolvedValue('not valid json {{{');
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const result = await projectService.getAllProjects();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
        consoleErrorSpy.mockRestore();
    });

    test('restituisce lista progetti se file esiste e valido', async () => {
        const mockProjects = [
            { id: 'p1', name: 'Proj 1', status: 'active' },
            { id: 'p2', name: 'Proj 2', status: 'draft' }
        ];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(mockProjects));
        const result = await projectService.getAllProjects();
        expect(result).toEqual(mockProjects);
    });
});

// ============================================================================
// TEST: createProject (CORRETTO - mock filtra per filename)
// ============================================================================

describe('projectService - createProject', () => {

    test('genera UUID, imposta status active e salva', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([]));

        // ✅ Mock che filtra per filename: applica assert solo su projects.json
        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content);
                expect(Array.isArray(saved)).toBe(true);
                expect(saved[0].status).toBe('active');
            }
            // Per threat-model.json e config.json, non fare assert specifici
            return Promise.resolve();
        });

        fs.promises.access.mockRejectedValue({ code: 'ENOENT' });

        const result = await projectService.createProject({
            name: 'Test Project',
            description: 'Descrizione di test'
        });

        expect(result).toHaveProperty('id');
        expect(result.name).toBe('Test Project');
        expect(result.status).toBe('active');
        expect(result).toHaveProperty('createdAt');
        expect(fs.promises.writeFile).toHaveBeenCalled();
        expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    test('disattiva progetti attivi preesistenti', async () => {
        const existingActive = { id: 'existing-1', name: 'Old', status: 'active' };
        fs.promises.readFile.mockResolvedValue(JSON.stringify([existingActive]));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content);
                const oldProject = saved.find(p => p.id === 'existing-1');
                expect(oldProject.status).toBe('draft');
            }
            return Promise.resolve();
        });

        fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
        await projectService.createProject({ name: 'New Project' });
    });

    test('trimma name, description e owner prima di salvare', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([]));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content);
                const newProject = saved.find(p => p.name === 'Trimmed Name');
                expect(newProject).toBeDefined();
                expect(newProject.description).toBe('Trimmed Desc');
            }
            return Promise.resolve();
        });

        fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
        await projectService.createProject({
            name: '  Trimmed Name  ',
            description: '  Trimmed Desc  ',
            owner: '  Trimmed Owner  '
        });
    });

    test('usa valori di default se name non fornito', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([]));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content);
                const newProject = saved.find(p => p.name === 'Nuovo Progetto');
                expect(newProject).toBeDefined();
            }
            return Promise.resolve();
        });

        fs.promises.access.mockRejectedValue({ code: 'ENOENT' });
        await projectService.createProject({});
    });
});

// ============================================================================
// TEST: updateProject
// ============================================================================

describe('projectService - updateProject', () => {

    test('aggiorna name e description, preserva id e status', async () => {
        const project = {
            id: 'test-123',
            name: 'Original',
            description: 'Old desc',
            status: 'draft'
        };
        fs.promises.readFile.mockResolvedValue(JSON.stringify([project]));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content)[0];
                expect(saved.id).toBe('test-123');
                expect(saved.status).toBe('draft');
                expect(saved.name).toBe('Updated Name');
            }
            return Promise.resolve();
        });

        const result = await projectService.updateProject('test-123', {
            name: 'Updated Name',
            description: 'New description'
        });

        expect(result.name).toBe('Updated Name');
        expect(result.status).toBe('draft');
    });

    test('ignora tentativi di modificare id o status', async () => {
        const project = { id: 'test-123', name: 'Original', status: 'draft' };
        fs.promises.readFile.mockResolvedValue(JSON.stringify([project]));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content)[0];
                expect(saved.id).toBe('test-123');
                expect(saved.status).toBe('draft');
            }
            return Promise.resolve();
        });

        await projectService.updateProject('test-123', {
            name: 'Updated',
            id: 'hacked-id',
            status: 'active'
        });
    });

    test('lancia errore se progetto non trovato', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([
            { id: 'other-123', name: 'Other' }
        ]));

        await expect(
            projectService.updateProject('not-found-id', { name: 'Test' })
        ).rejects.toThrow('Progetto non trovato');
    });
});

// ============================================================================
// TEST: setStatus
// ============================================================================

describe('projectService - setStatus', () => {

    test('cambia stato progetto a archived', async () => {
        const projects = [{ id: 'p1', name: 'Proj 1', status: 'draft', updatedAt: 'old' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(projects));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content)[0];
                expect(saved.status).toBe('archived');
            }
            return Promise.resolve();
        });

        const result = await projectService.setStatus('p1', 'archived');
        expect(result.status).toBe('archived');
    });

    test('cambia stato progetto a active e disattiva gli altri', async () => {
        const projects = [
            { id: 'p1', name: 'Proj 1', status: 'active' },
            { id: 'p2', name: 'Proj 2', status: 'draft' }
        ];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(projects));

        fs.promises.writeFile.mockImplementation((filepath, content) => {
            if (filepath.includes('projects.json')) {
                const saved = JSON.parse(content);
                const p1 = saved.find(p => p.id === 'p1');
                const p2 = saved.find(p => p.id === 'p2');
                expect(p1.status).toBe('draft');
                expect(p2.status).toBe('active');
            }
            return Promise.resolve();
        });

        const result = await projectService.setStatus('p2', 'active');
        expect(result.status).toBe('active');
    });

    test('lancia errore per stato non valido', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([{ id: 'p1', status: 'draft' }]));
        await expect(projectService.setStatus('p1', 'invalid-status'))
            .rejects.toThrow('Stato non valido');
    });

    test('lancia errore se progetto non trovato', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([{ id: 'other-123', status: 'draft' }]));
        await expect(projectService.setStatus('not-found-id', 'active'))
            .rejects.toThrow('Progetto non trovato');
    });
});

// ============================================================================
// TEST: getActiveProjectDir / getProjectDir
// ============================================================================

describe('projectService - Directory resolution', () => {

    test('getActiveProjectDir restituisce null se nessun progetto attivo', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([
            { id: 'p1', status: 'draft' },
            { id: 'p2', status: 'archived' }
        ]));
        const result = await projectService.getActiveProjectDir();
        expect(result).toBeNull();
    });

    test('getActiveProjectDir restituisce path corretto se progetto attivo', async () => {
        const activeProject = { id: 'active-uuid-123', status: 'active' };
        fs.promises.readFile.mockResolvedValue(JSON.stringify([activeProject]));
        const result = await projectService.getActiveProjectDir();
        expect(result).toContain('active-uuid-123');
        expect(result).toContain('data');
        expect(path.isAbsolute(result)).toBe(true);
    });

    test('getProjectDir restituisce path per progetto specifico', async () => {
        const projects = [{ id: 'target-uuid', name: 'Target', status: 'draft' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(projects));
        const result = await projectService.getProjectDir('target-uuid');
        expect(result).toContain('target-uuid');
        expect(result).toContain('data');
    });

    test('getProjectDir restituisce null se progetto non esiste', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([{ id: 'other-uuid', status: 'draft' }]));
        const result = await projectService.getProjectDir('not-found-uuid');
        expect(result).toBeNull();
    });
});

// ============================================================================
// TEST: ensureProjectDir (indiretto)
// ============================================================================

describe('projectService - ensureProjectDir (indiretto)', () => {

    test('createProject chiama ensureProjectDir che crea cartella e file base', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([]));
        fs.promises.access.mockRejectedValue({ code: 'ENOENT' });

        await projectService.createProject({ name: 'Test' });

        const mkdirCalls = fs.promises.mkdir.mock.calls;
        const hasUuidCall = mkdirCalls.some(call =>
            call[0].match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
        );
        expect(hasUuidCall).toBe(true);

        expect(fs.promises.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('threat-model.json'),
            expect.stringContaining('"assets": []')
        );
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('config.json'),
            expect.stringContaining('{}')
        );
    });
});