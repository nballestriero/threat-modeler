const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { callOllama, extractFirstJSON } = require('../../utils/llmUtils');
const { loadConfig } = require('../../utils/configUtils');
const { loadModel } = require('../../models/assetModel');
const { loadAdvanced, saveAdvanced } = require('../../routes/advancedAssets');

const METHOD_NAME = 'stride-ai';   // <-- questa riga è fondamentale
const TAXONOMY_PATH = path.join(__dirname, './context/stride-ai-taxonomy.json');

let TAXONOMY = null;
try {
    TAXONOMY = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf-8'));
    console.log(`✅ [${METHOD_NAME}] Tassonomia caricata`);
} catch (err) {
    console.warn(`⚠️ [${METHOD_NAME}] Tassonomia non trovata, uso default`);
    TAXONOMY = {
        categories: [
            { name: 'Data', color: '#27500A', colorBg: '#EAF3DE' },
            { name: 'Models', color: '#3C3489', colorBg: '#EEEDFE' },
            { name: 'Actors', color: '#633806', colorBg: '#FAEEDA' },
            { name: 'Processes', color: '#085041', colorBg: '#E1F5EE' },
            { name: 'Tools', color: '#712B13', colorBg: '#FAECE7' },
            { name: 'Artefacts', color: '#444441', colorBg: '#F1EFE8' }
        ]
    };
}

function buildTaxonomyPrompt() {
    if (!TAXONOMY.categories.length) return '';
    return TAXONOMY.categories.map(cat => {
        const subcats = (cat.subcategories || []).map(sub => `    - ${sub.name}: ${sub.description}`).join('\n');
        return `${cat.name}: ${cat.description}\nSottocategorie:\n${subcats}`;
    }).join('\n\n');
}

async function enhanceSingle(baseAsset, flows, config) {
    const context = baseAsset.contextChunk || '';
    const relatedFlows = flows.filter(f => f.fromId === baseAsset.id || f.toId === baseAsset.id);
    let flowsContext = '';
    if (relatedFlows.length) {
        flowsContext = '\n\nRelazioni definite nel DFD:\n';
        for (const flow of relatedFlows) {
            const fromAsset = baseAsset.model?.assets?.find(a => a.id === flow.fromId);
            const toAsset = baseAsset.model?.assets?.find(a => a.id === flow.toId);
            if (fromAsset && toAsset) {
                flowsContext += `- "${fromAsset.name}" --> "${flow.label}" --> "${toAsset.name}"\n`;
            }
        }
    }

    const taxonomyPrompt = buildTaxonomyPrompt();
    const systemPrompt = `Sei un classificatore di asset per threat modeling con la metodologia STRIDE-AI.
Ecco la tassonomia:
${taxonomyPrompt}

Restituisci SOLO JSON con: { "category": "...", "subCategory": "...", "description": "descrizione oggettiva" }`;

    const userPrompt = `Asset: "${baseAsset.name}"
Testo originale:
${context}
${flowsContext}
Classifica secondo la tassonomia sopra.`;

    const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.2, num_predict: 512 });
    const jsonString = extractFirstJSON(response);
    const parsed = JSON.parse(jsonString);

    return {
        category: parsed.category || '',
        subCategory: parsed.subCategory || '',
        description: parsed.description || ''
    };
}

function generateMermaidDFD(assets, taxonomy, flows) {
    if (!assets.length) return 'flowchart TD\n    A[Nessun asset arricchito]';
    const assetMap = new Map();
    for (const asset of assets) {
        const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
        assetMap.set(asset.id, { safeId, name: asset.name, category: asset.category });
    }
    const groups = new Map();
    for (const [id, { safeId, name, category }] of assetMap.entries()) {
        const shape = {
            'Data': '[({name})]',
            'Models': '["{name}"]',
            'Actors': '(["{name}"])',
            'Processes': '["{name}"]',
            'Tools': '["{name}"]',
            'Artefacts': '(("{name}"))'
        }[category] || '["{name}"]';
        const safeName = name.replace(/"/g, '&quot;');
        const nodeDef = shape.replace('{name}', safeName);
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(`    ${safeId}${nodeDef}`);
    }
    let code = 'flowchart TD\n';
    for (const [category, nodeList] of groups.entries()) {
        const catInfo = taxonomy.categories.find(c => c.name === category);
        const bgColor = catInfo?.colorBg || '#f3f4f6';
        const borderColor = catInfo?.color || '#6b7280';
        const subgraphId = category.replace(/\s/g, '_');
        code += `    subgraph ${subgraphId} ["${category}"]\n`;
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

const router = express.Router();

router.get('/assets', async (req, res) => {
    const model = await loadModel();
    const advanced = await loadAdvanced();
    const myAdvanced = advanced.filter(a => a.method === METHOD_NAME);
    const merged = model.assets.map(base => {
        const adv = myAdvanced.find(a => a.originalAssetId === base.id);
        return {
            id: base.id,
            originalAssetId: base.id,
            name: base.name,
            category: adv?.category || '',
            subCategory: adv?.subCategory || '',
            description: adv?.description || '',
            contextChunk: base.contextChunk,
            method: METHOD_NAME,
            enriched: !!adv
        };
    });
    res.json(merged);
});

router.put('/assets/:id', async (req, res) => {
    const assets = await loadAdvanced();
    const idx = assets.findIndex(a => a.originalAssetId === req.params.id && a.method === METHOD_NAME);
    if (idx === -1) {
        const newAsset = {
            id: uuidv4(),
            originalAssetId: req.params.id,
            name: req.body.name || '',
            category: req.body.category || '',
            subCategory: req.body.subCategory || '',
            description: req.body.description || '',
            contextChunk: req.body.contextChunk || '',
            method: METHOD_NAME
        };
        assets.push(newAsset);
        await saveAdvanced(assets);
        res.status(201).json(newAsset);
    } else {
        assets[idx] = { ...assets[idx], ...req.body, method: METHOD_NAME };
        await saveAdvanced(assets);
        res.json(assets[idx]);
    }
});

router.delete('/assets/:id', async (req, res) => {
    const assets = await loadAdvanced();
    const filtered = assets.filter(a => !(a.originalAssetId === req.params.id && a.method === METHOD_NAME));
    await saveAdvanced(filtered);
    res.json({ success: true });
});

router.post('/enrich', async (req, res) => {
    const { assetIds } = req.body;
    const config = await loadConfig();
    if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

    const model = await loadModel();
    let baseAssets = model.assets;
    if (assetIds?.length) baseAssets = baseAssets.filter(a => assetIds.includes(a.id));

    const existing = await loadAdvanced();
    const enriched = [];

    for (const base of baseAssets) {
        console.log(`   [${METHOD_NAME}] Arricchimento: ${base.name}`);
        const enhancement = await enhanceSingle(base, model.flows, config);
        const existingIdx = existing.findIndex(a => a.originalAssetId === base.id && a.method === METHOD_NAME);
        const adv = {
            id: existingIdx !== -1 ? existing[existingIdx].id : uuidv4(),
            originalAssetId: base.id,
            name: base.name,
            category: enhancement.category,
            subCategory: enhancement.subCategory,
            description: enhancement.description,
            contextChunk: base.contextChunk,
            method: METHOD_NAME
        };
        if (existingIdx !== -1) existing[existingIdx] = adv;
        else existing.push(adv);
        enriched.push(adv);
    }
    await saveAdvanced(existing);
    res.json(enriched);
});

router.get('/dfd', async (req, res) => {
    const model = await loadModel();
    const advanced = await loadAdvanced();
    const myAdvanced = advanced.filter(a => a.method === METHOD_NAME);

    // Mappa per accesso veloce
    const advMap = new Map();
    for (const adv of myAdvanced) {
        advMap.set(adv.originalAssetId, adv);
    }

    // Costruisce l'elenco di tutti gli asset base, arricchiti se disponibili
    const allAssets = model.assets.map(base => {
        const adv = advMap.get(base.id);
        return {
            id: base.id,
            name: base.name,
            category: adv ? adv.category : base.category,   // categoria avanzata o DFD base
            subCategory: adv ? adv.subCategory : '',
            description: adv ? adv.description : base.description,
            contextChunk: base.contextChunk,
            enriched: !!adv
        };
    });

    const flows = model.flows || [];
    const mermaid = generateMermaidDFD(allAssets, TAXONOMY, flows);
    res.json({ mermaid, assets: allAssets });
});


router.get('/taxonomy', (req, res) => {
    res.json(TAXONOMY);
});

module.exports = { METHOD_NAME, router, taxonomy: TAXONOMY };