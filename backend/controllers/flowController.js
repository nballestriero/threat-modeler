// backend/controllers/flowController.js
/**
 * @file Controller per i flussi di dati
 * @module controllers/flowController
 */

const flowService = require('../services/flowService');

/**
 * GET /api/flows
 */
async function getAllFlows(req, res) {
    const flows = await flowService.getAllFlows();
    res.json(flows);
}

/**
 * POST /api/flows
 */
async function createFlow(req, res) {
    const flow = await flowService.createFlow(req.body);
    res.status(201).json(flow);
}

/**
 * PUT /api/flows/:id
 */
async function updateFlow(req, res) {
    try {
        const updated = await flowService.updateFlow(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
}

/**
 * DELETE /api/flows/:id
 */
async function deleteFlow(req, res) {
    try {
        const result = await flowService.deleteFlow(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
}

module.exports = { getAllFlows, createFlow, updateFlow, deleteFlow };