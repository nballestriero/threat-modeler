const express = require('express');
const router = express.Router();
const { loadModel, saveModel } = require('../models/assetModel');
const { v4: uuidv4 } = require('uuid');

function generateMermaidDFD(assets, options = { groupByCategory: true }) {
    const categoryToShape = {
        Actors: '(["{name}"])',
        Processes: '["{name}"]',
        Data: '[({name})]',
        Infrastructure: '[({name})]',
        Tools: '["{name}"]',
        Artefacts: '(("{name}"))',
        Models: '["{name}"]',
        default: '(("{name}"))',
    };

    // Sostituisce qualsiasi carattere non alfanumerico con underscore
    const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');

    let mermaid = 'flowchart TD\n';
    if (options.groupByCategory) {
        const subgraphs = new Map();
        for (const asset of assets) {
            const safeId = sanitizeId(asset.id);
            const safeName = asset.name.replace(/"/g, '&quot;');
            const shape = categoryToShape[asset.category] || categoryToShape.default;
            const nodeDef = shape.replace('{name}', safeName);
            if (!subgraphs.has(asset.category)) subgraphs.set(asset.category, []);
            subgraphs.get(asset.category).push(`    ${safeId}${nodeDef}`);
        }
        for (const [category, nodeList] of subgraphs.entries()) {
            mermaid += `    subgraph ${category}\n${nodeList.join('\n')}\n    end\n`;
        }
    }
    return mermaid;
}
router.get('/dfd', async (req, res) => {
    const model = await loadModel();
    const mermaid = generateMermaidDFD(model.assets, { groupByCategory: true });
    res.json({ mermaid, assets: model.assets });
});

router.put('/dfd/asset/:id', async (req, res) => {
    const model = await loadModel();
    const idx = model.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
    model.assets[idx] = { ...model.assets[idx], ...req.body, id: req.params.id };
    await saveModel(model);
    res.json(model.assets[idx]);
});

router.post('/dfd/asset', async (req, res) => {
    const model = await loadModel();
    const newAsset = { id: uuidv4(), ...req.body };
    model.assets.push(newAsset);
    await saveModel(model);
    res.status(201).json(newAsset);
});

module.exports = router;