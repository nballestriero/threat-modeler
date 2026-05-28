// backend/routes/dfd.js
const express = require('express');
const router = express.Router();
const { loadModel } = require('../models/assetModel');

function generateMermaidDFD(assets, taxonomy, flows) {
    if (!assets.length) return 'flowchart TD\n    A[Nessun asset. Crea asset base nella fase 2.]';

    const assetMap = new Map();
    for (const asset of assets) {
        const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
        assetMap.set(asset.id, { safeId, name: asset.name, category: asset.category });
    }

    // Raggruppa per categoria; se vuota, usa "Unclassified"
    const groups = new Map();
    for (const [id, { safeId, name, category }] of assetMap.entries()) {
        const groupName = category || 'Unclassified';
        const shape = {
            'Data': '[({name})]',
            'Models': '["{name}"]',
            'Actors': '(["{name}"])',
            'Processes': '["{name}"]',
            'Tools': '["{name}"]',
            'Artefacts': '(("{name}"))',
            'Unclassified': '["{name}"]'
        }[groupName] || '["{name}"]';
        const safeName = name.replace(/"/g, '&quot;');
        const nodeDef = shape.replace('{name}', safeName);
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName).push(`    ${safeId}${nodeDef}`);
    }

    let code = 'flowchart TD\n';
    for (const [groupName, nodeList] of groups.entries()) {
        const catInfo = taxonomy.categories.find(c => c.name === groupName);
        const bgColor = catInfo?.colorBg || (groupName === 'Unclassified' ? '#e5e7eb' : '#f3f4f6');
        const borderColor = catInfo?.color || (groupName === 'Unclassified' ? '#6b7280' : '#6b7280');
        const subgraphId = groupName.replace(/\s/g, '_');
        code += `    subgraph ${subgraphId} ["${groupName}"]\n`;
        code += `        style ${subgraphId} fill:${bgColor},stroke:${borderColor},stroke-width:2px\n`;
        code += nodeList.join('\n');
        code += `\n    end\n`;
    }

    if (flows && flows.length) {
        code += `\n    %% Flussi\n`;
        for (const flow of flows) {
            if (assetMap.has(flow.fromId) && assetMap.has(flow.toId)) {
                const fromId = assetMap.get(flow.fromId).safeId;
                const toId = assetMap.get(flow.toId).safeId;
                const safeLabel = flow.label.replace(/"/g, '&quot;');
                code += `    ${fromId} -->|"${safeLabel}"| ${toId}\n`;
            }
        }
    }
    return code;
}
router.get('/dfd', async (req, res) => {
    const model = await loadModel();
    const advanced = await loadAdvanced();
    const myAdvanced = advanced.filter(a => a.method === METHOD_NAME);

    // Crea una lista di tutti gli asset base, aggiungendo la categoria da advanced se presente
    const assetsWithCategories = model.assets.map(base => {
        const adv = myAdvanced.find(a => a.originalAssetId === base.id);
        return {
            id: base.id,
            name: base.name,
            category: adv?.category || ''   // vuoto se non ancora arricchito
        };
    });

    const flows = model.flows || [];
    const mermaid = generateMermaidDFD(assetsWithCategories, TAXONOMY, flows);
    res.json({ mermaid, assets: assetsWithCategories });
});

module.exports = router;