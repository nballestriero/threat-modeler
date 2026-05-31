/**
 * @file Rotte REST per la gestione progetti
 * @module routes/projects
 * 
 * @description
 * Gestisce tutte le operazioni CRUD per i progetti, inclusa l'attivazione/archiviazione.
 * Le rotte operano su `projects.json` e creano directory isolate per ogni progetto.
 * 
 * ## Endpoint gestiti
 * | Metodo | Endpoint | Descrizione |
 * |--------|----------|-------------|
 * | GET | `/api/projects` | Recupera lista progetti |
 * | POST | `/api/projects` | Crea nuovo progetto (auto-attivato) |
 * | PUT | `/api/projects/:id` | Aggiorna metadati progetto |
 * | POST | `/api/projects/:id/status` | Cambia stato progetto (draft/active/archived) |
 * 
 * @see {@link ../services/projectService.js} Service per logica business
 */

const express = require('express');
const router = express.Router();
const projectService = require('../services/projectService');

/**
 * @route GET /api/projects
 * @desc Recupera la lista completa di tutti i progetti
 * @access Public
 * @returns {Array<Object>} Lista di progetti con metadati
 * @example
 * GET /api/projects
 * → 200 OK
 * [
 *   { "id": "uuid-1", "name": "Progetto A", "status": "active", ... },
 *   { "id": "uuid-2", "name": "Progetto B", "status": "draft", ... }
 * ]
 */
router.get('/', async (req, res) => {
    try {
        const projects = await projectService.getAllProjects();
        res.json(projects);
    } catch (err) {
        console.error('❌ [ROUTES] Errore in GET /projects:', err.message);
        res.status(500).json({ error: 'Impossibile recuperare i progetti' });
    }
});

/**
 * @route POST /api/projects
 * @desc Crea un nuovo progetto e lo imposta automaticamente come attivo
 * @access Public
 * @param {Object} req.body - Dati del progetto
 * @param {string} req.body.name - Nome del progetto (obbligatorio)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @param {string} [req.body.owner] - Proprietario opzionale
 * @returns {Object} Progetto creato con ID generato e status 'active'
 * @example
 * POST /api/projects
 * Body: { "name": "Nuovo Progetto", "description": "Desc" }
 * → 201 Created
 * { "id": "uuid-new", "name": "Nuovo Progetto", "status": "active", ... }
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, owner } = req.body;

        // Validazione base
        if (!name?.trim()) {
            return res.status(400).json({
                error: 'Il campo "name" è obbligatorio e non può essere vuoto',
                field: 'name'
            });
        }

        const project = await projectService.createProject({ name, description, owner });
        res.status(201).json(project);
    } catch (err) {
        console.error('❌ [ROUTES] Errore in POST /projects:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route PUT /api/projects/:id
 * @desc Aggiorna i metadati di un progetto esistente
 * @access Public
 * @param {string} req.params.id - ID del progetto da aggiornare
 * @param {Object} req.body - Campi da aggiornare (name, description, owner)
 * @returns {Object} Progetto aggiornato
 * @example
 * PUT /api/projects/uuid-123
 * Body: { "name": "Nome Aggiornato" }
 * → 200 OK
 * { "id": "uuid-123", "name": "Nome Aggiornato", "status": "active", ... }
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validazione: name non può essere vuoto se fornito
        if (updates.name !== undefined && !updates.name.trim()) {
            return res.status(400).json({
                error: 'Il campo "name" non può essere vuoto',
                field: 'name'
            });
        }

        const updated = await projectService.updateProject(id, updates);
        res.json(updated);
    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [ROUTES] Errore in PUT /projects/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/projects/:id/status
 * @desc Cambia lo stato di un progetto (draft → active → archived)
 * @access Public
 * @param {string} req.params.id - ID del progetto
 * @param {string} req.body.status - Nuovo stato: 'draft' | 'active' | 'archived'
 * @returns {Object} Progetto aggiornato con nuovo stato
 * @example
 * POST /api/projects/uuid-123/status
 * Body: { "status": "archived" }
 * → 200 OK
 * { "id": "uuid-123", "name": "Progetto", "status": "archived", ... }
 */
router.post('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // ✅ Verifica che il progetto esista prima di tentare lo status update
        const projects = await projectService.getAllProjects();
        const exists = projects.some(p => p.id === id);
        if (!exists) {
            return res.status(404).json({ error: `Progetto non trovato: ${id}` });
        }

        const updated = await projectService.setStatus(id, status);
        res.json(updated);
    } catch (err) {
        if (err.message?.includes('non valido')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [ROUTES] Errore in POST /projects/:id/status:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;