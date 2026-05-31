/**
 * @file Rotte REST per la gestione di asset e flussi
 * @module routes/assets
 * 
 * @description
 * Gestisce tutte le operazioni CRUD per asset e flussi, più endpoint avanzati
 * per importazione bulk e suggerimenti AI.
 * 
 * ## Endpoint gestiti
 * | Metodo | Endpoint | Descrizione |
 * |--------|----------|-------------|
 * | GET | `/api/assets` | Recupera tutti gli asset |
 * | POST | `/api/assets` | Crea un nuovo asset |
 * | POST | `/api/assets/import` | Importa asset in blocco (LLM extraction) |
 * | PUT | `/api/assets/:id` | Aggiorna un asset esistente |
 * | DELETE | `/api/assets/:id` | Elimina un asset (cascade delete flussi orfani) |
 * | POST | `/api/assets/:id/suggest` | Suggerimenti AI per migliorare un asset |
 * | GET | `/api/flows` | Recupera tutti i flussi |
 * | POST | `/api/flows` | Crea un nuovo flusso |
 * | PUT | `/api/flows/:id` | Aggiorna un flusso esistente |
 * | DELETE | `/api/flows/:id` | Elimina un flusso |
 * 
 * @see {@link ../controllers/assetController.js} Controller per operazioni asset
 * @see {@link ../controllers/flowController.js} Controller per operazioni flussi
 * @see {@link ../controllers/assetSuggestionController.js} Controller per suggerimenti AI
 */

const express = require('express');
const router = express.Router();

// Import controller
const assetController = require('../controllers/assetController');
const flowController = require('../controllers/flowController');
const { suggestAsset } = require('../controllers/assetSuggestionController');

// ============================================================================
// ROUTE PER ASSET
// ============================================================================

/**
 * @route GET /api/assets
 * @desc Recupera tutti gli asset del progetto attivo
 * @access Public
 * @returns {Array<Object>} Lista di asset con id, name, category, description
 * @example
 * GET /api/assets
 * → 200 OK
 * [
 *   { "id": "uuid-1", "name": "API Gateway", "category": "Process", ... },
 *   { "id": "uuid-2", "name": "Database", "category": "Data Store", ... }
 * ]
 */
router.get('/assets', assetController.getAllAssets);

/**
 * @route POST /api/assets
 * @desc Crea un nuovo asset nel progetto attivo
 * @access Public
 * @param {Object} req.body - Dati dell'asset
 * @param {string} req.body.name - Nome dell'asset (obbligatorio)
 * @param {string} req.body.category - Categoria DFD (obbligatoria)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @returns {Object} Asset creato con id generato e createdAt
 * @example
 * POST /api/assets
 * Body: { "name": "Nuovo Servizio", "category": "Process" }
 * → 201 Created
 * { "id": "uuid-new", "name": "Nuovo Servizio", "category": "Process", "createdAt": "2025-05-31T..." }
 */
router.post('/assets', assetController.createAsset);

/**
 * @route POST /api/assets/import
 * @desc Importa asset in blocco da estrazione LLM/RAG
 * @access Public
 * @param {Object} req.body - Payload di importazione
 * @param {Array<Object>} req.body.assets - Lista di asset da importare
 * @returns {Object} Riepilogo importazione con conteggi
 * @example
 * POST /api/assets/import
 * Body: { "assets": [ { "name": "API", "category": "Process" }, ... ] }
 * → 200 OK
 * { "saved": 5, "duplicates": 2 }
 */
router.post('/assets/import', assetController.importAssets);

/**
 * @route PUT /api/assets/:id
 * @desc Aggiorna un asset esistente nel progetto attivo
 * @access Public
 * @param {string} req.params.id - ID dell'asset da aggiornare
 * @param {Object} req.body - Campi da aggiornare (parziali)
 * @returns {Object} Asset aggiornato con tutti i campi
 * @example
 * PUT /api/assets/uuid-123
 * Body: { "name": "Nome Aggiornato", "description": "Nuova descrizione" }
 * → 200 OK
 * { "id": "uuid-123", "name": "Nome Aggiornato", "category": "Process", ... }
 */
router.put('/assets/:id', assetController.updateAsset);

/**
 * @route DELETE /api/assets/:id
 * @desc Elimina un asset e i flussi orfani correlati (cascade delete)
 * @access Public
 * @param {string} req.params.id - ID dell'asset da eliminare
 * @returns {Object} Conferma eliminazione con conteggio flussi rimossi
 * @example
 * DELETE /api/assets/uuid-123
 * → 200 OK
 * { "success": true, "orphanFlowsDeleted": 3 }
 */
router.delete('/assets/:id', assetController.deleteAsset);

/**
 * @route POST /api/assets/:id/suggest
 * @desc Genera suggerimenti AI per migliorare un asset esistente
 * @access Public
 * @param {string} req.params.id - ID dell'asset da migliorare
 * @returns {Object} Suggerimenti generati dall'LLM
 * @example
 * POST /api/assets/uuid-123/suggest
 * → 200 OK
 * { "suggestions": { "name": "Nome suggerito", "description": "Descrizione migliorata", ... } }
 */
router.post('/assets/:id/suggest', suggestAsset);

// ============================================================================
// ROUTE PER FLUSSI
// ============================================================================

/**
 * @route GET /api/flows
 * @desc Recupera tutti i flussi del progetto attivo
 * @access Public
 * @returns {Array<Object>} Lista di flussi con id, fromId, toId, label
 * @example
 * GET /api/flows
 * → 200 OK
 * [
 *   { "id": "flow-1", "fromId": "asset-a", "toId": "asset-b", "label": "HTTPS", ... }
 * ]
 */
router.get('/flows', flowController.getAllFlows);

/**
 * @route POST /api/flows
 * @desc Crea un nuovo flusso nel progetto attivo con validazione DFD Base
 * @access Public
 * @param {Object} req.body - Dati del flusso
 * @param {string} req.body.fromId - ID asset sorgente (obbligatorio)
 * @param {string} req.body.toId - ID asset destinazione (obbligatorio)
 * @param {string} req.body.label - Etichetta del flusso (obbligatoria)
 * @param {string} [req.body.description] - Descrizione opzionale
 * @returns {Object} Flusso creato con id generato e createdAt
 * @throws {400} Se il flusso viola le regole DFD Base
 * @example
 * POST /api/flows
 * Body: { "fromId": "asset-a", "toId": "asset-b", "label": "API Call" }
 * → 201 Created
 * { "id": "flow-new", "fromId": "asset-a", "toId": "asset-b", "label": "API Call", ... }
 */
router.post('/flows', flowController.createFlow);

/**
 * @route PUT /api/flows/:id
 * @desc Aggiorna un flusso esistente nel progetto attivo
 * @access Public
 * @param {string} req.params.id - ID del flusso da aggiornare
 * @param {Object} req.body - Campi da aggiornare (parziali)
 * @returns {Object} Flusso aggiornato con tutti i campi
 * @example
 * PUT /api/flows/flow-123
 * Body: { "label": "HTTPS Encrypted", "description": "Aggiornato" }
 * → 200 OK
 * { "id": "flow-123", "label": "HTTPS Encrypted", "fromId": "asset-a", ... }
 */
router.put('/flows/:id', flowController.updateFlow);

/**
 * @route DELETE /api/flows/:id
 * @desc Elimina un flusso esistente
 * @access Public
 * @param {string} req.params.id - ID del flusso da eliminare
 * @returns {Object} Conferma eliminazione
 * @example
 * DELETE /api/flows/flow-123
 * → 200 OK
 * { "success": true }
 */
router.delete('/flows/:id', flowController.deleteFlow);

module.exports = router;