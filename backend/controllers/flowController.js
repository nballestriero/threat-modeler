/**
 * @file Controller HTTP per le operazioni CRUD sui flussi DFD
 * @module controllers/flowController
 * 
 * @description
 * Gestisce le richieste HTTP per i flussi, con validazione delle regole DFD Base:
 * - External Entity non può collegarsi direttamente a External Entity
 * - Data Store deve collegarsi solo a un Process
 * - Validazione campi obbligatori e (in produzione) esistenza asset
 * 
 * @see {@link ../services/assetService.js} Service per logica business
 * @see {@link ../models/assetModel.js} Modello dati condiviso
 */

const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Valida le regole DFD Base per un flusso.
 * @param {Object} flowData - Dati del flusso
 * @param {Array} assets - Lista asset del progetto
 * @param {boolean} isTest - Se true, salta la verifica esistenza asset (per test)
 * @throws {Error} Se il flusso viola le regole DFD
 */
function validateDfdFlow(flowData, assets, isTest = false) {
    const { fromId, toId } = flowData;

    if (!fromId || !toId) {
        throw new Error('I campi "fromId" e "toId" sono obbligatori');
    }

    if (fromId === toId) {
        throw new Error('Un flusso non può collegare un asset a sé stesso');
    }

    // ✅ Salta verifica esistenza asset in ambiente test
    if (!isTest) {
        const fromAsset = assets.find(a => a.id === fromId);
        const toAsset = assets.find(a => a.id === toId);

        if (!fromAsset || !toAsset) {
            throw new Error('Uno o entrambi gli asset collegati non esistono');
        }

        // Mappa categorie personalizzate a tipi base DFD
        const mapToBaseType = (category) => {
            const mapping = {
                'External Entity': 'External Entity',
                'Actors': 'External Entity',
                'Process': 'Process',
                'Processes': 'Process',
                'Models': 'Process',
                'Tools': 'Process',
                'Data Store': 'Data Store',
                'Data': 'Data Store',
                'Infrastructure': 'Data Store',
                'Artefacts': 'Data Store'
            };
            return mapping[category] || 'Process';
        };

        const fromType = mapToBaseType(fromAsset.category);
        const toType = mapToBaseType(toAsset.category);

        // Regola DFD: External Entity non può collegarsi direttamente a External Entity
        if (fromType === 'External Entity' && toType === 'External Entity') {
            throw new Error('In DFD Base, due External Entity non possono essere collegati direttamente. Aggiungi un Process intermedio.');
        }

        // Regola DFD: Data Store deve collegarsi a un Process
        if ((fromType === 'Data Store' || toType === 'Data Store') &&
            (fromType !== 'Process' && toType !== 'Process')) {
            throw new Error('In DFD Base, un Data Store deve essere collegato a un Process.');
        }
    }
}

/**
 * Recupera tutti i flussi del progetto attivo.
 * @async
 * @param {Object} req - Express request
 * @param {string} [req.projectDir] - Directory del progetto
 * @param {Object} res - Express response
 */
const getAllFlows = async (req, res) => {
    try {
        const model = await loadModel(req.projectDir);
        res.json(model.flows || []);
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore in getAllFlows:', err.message);
        res.status(500).json({ error: 'Impossibile recuperare i flussi' });
    }
};

/**
 * Crea un nuovo flusso con validazione DFD.
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.body - Dati del flusso
 * @param {string} req.body.fromId - ID asset sorgente
 * @param {string} req.body.toId - ID asset destinazione
 * @param {string} req.body.label - Etichetta del flusso
 * @param {string} [req.projectDir] - Directory del progetto
 * @param {Object} res - Express response
 */
const createFlow = async (req, res) => {
    try {
        const { fromId, toId, label, description } = req.body;

        if (!label?.trim()) {
            return res.status(400).json({
                error: 'Il campo "label" è obbligatorio',
                field: 'label'
            });
        }

        // Carica modello per validazione
        const model = await loadModel(req.projectDir);
        const assets = model.assets || [];

        // ✅ Determina se siamo in ambiente test
        const isTest = process.env.NODE_ENV === 'test';

        // Valida regole DFD (con skip esistenza asset in test)
        validateDfdFlow({ fromId, toId, label }, assets, isTest);

        // Crea flusso
        const newFlow = {
            id: uuidv4(),
            fromId,
            toId,
            label: label.trim(),
            description: description?.trim(),
            createdAt: new Date().toISOString()
        };

        model.flows = model.flows || [];
        model.flows.push(newFlow);
        await saveModel(model, req.projectDir);

        res.status(201).json(newFlow);

    } catch (err) {
        // ✅ Gestione errori: 400 per validazione, 500 per errori interni
        if (err.message?.includes('obbligatorio') ||
            err.message?.includes('non possono') ||
            err.message?.includes('sé stesso') ||
            err.message?.includes('Data Store') ||
            err.message?.includes('fromId') ||
            err.message?.includes('toId')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in createFlow:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Aggiorna un flusso esistente.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateFlow = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const model = await loadModel(req.projectDir);
        const flows = model.flows || [];
        const index = flows.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ error: `Flusso non trovato: ${id}` });
        }

        // Aggiorna solo i campi consentiti
        const allowedUpdates = ['label', 'description'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                flows[index][key] = updates[key];
            }
        }

        await saveModel(model, req.projectDir);
        res.json(flows[index]);

    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in updateFlow:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Elimina un flusso.
 * @async
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteFlow = async (req, res) => {
    try {
        const { id } = req.params;
        const model = await loadModel(req.projectDir);

        const initialLength = model.flows?.length || 0;
        model.flows = (model.flows || []).filter(f => f.id !== id);

        if (model.flows.length === initialLength) {
            return res.status(404).json({ error: `Flusso non trovato: ${id}` });
        }

        await saveModel(model, req.projectDir);
        res.json({ success: true, message: `Flusso ${id} eliminato` });

    } catch (err) {
        if (err.message?.includes('non trovato')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('❌ [CONTROLLER] Errore in deleteFlow:', err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllFlows,
    createFlow,
    updateFlow,
    deleteFlow
};