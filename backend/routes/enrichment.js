const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../utils/configUtils');
const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const { loadModel } = require('../models/assetModel');
const { loadAdvanced, saveAdvanced } = require('./advancedAssets');

// Carica la tassonomia completa con descrizioni
const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');
let CATEGORIES_WITH_DESC = '';
try {
    const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf-8'));
    CATEGORIES_WITH_DESC = taxonomy.categories.map(cat => {
        const subcats = cat.subcategories.map(sub => `    - ${sub.name}: ${sub.description}`).join('\n');
        return `${cat.name}: ${cat.description}\nSottocategorie:\n${subcats}`;
    }).join('\n\n');
    console.log('✅ Tassonomia completa con descrizioni caricata');
} catch (err) {
    console.warn('⚠️ taxonomy.json non trovato, uso default');
    CATEGORIES_WITH_DESC = 'Data, Models, Infrastructure, Actors, Processes, Tools, Artefacts';
}

router.post('/analyze/enrich-assets', async (req, res) => {
    const { assetIds } = req.body;
    console.log('\n🔍 [ENRICH] Avvio arricchimento batch');
    const config = await loadConfig();
    if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

    console.log(`   🤖 Modello: ${config.ollama.model}`);
    console.log(`   🌐 Server Ollama: ${config.ollama.baseUrl}`);

    const model = await loadModel();
    let baseAssets = model.assets;
    if (assetIds?.length) baseAssets = baseAssets.filter(a => assetIds.includes(a.id));

    const existing = await loadAdvanced();
    const enriched = [];

    for (const base of baseAssets) {
        console.log(`\n   🏷️  Asset: ${base.name}`);
        const context = base.contextChunk || '';
        console.log(`      📄 Context chunk (primi 200): ${context.substring(0, 200)}...`);

        // Recupera flussi che coinvolgono l'asset
        const relatedFlows = model.flows.filter(f => f.fromId === base.id || f.toId === base.id);
        let flowsContext = '';
        if (relatedFlows.length) {
            flowsContext = '\n\nRelazioni definite nel DFD:\n';
            for (const flow of relatedFlows) {
                const fromAsset = model.assets.find(a => a.id === flow.fromId);
                const toAsset = model.assets.find(a => a.id === flow.toId);
                if (fromAsset && toAsset) {
                    flowsContext += `- "${fromAsset.name}" --> "${flow.label}" --> "${toAsset.name}"\n`;
                }
            }
        }

        const systemPrompt = `Sei un classificatore di asset per threat modeling.
Ecco la tassonomia con descrizioni:
${CATEGORIES_WITH_DESC}

Restituisci SOLO JSON con: { "category": "...", "subCategory": "...", "description": "descrizione oggettiva" }`;

        const userPrompt = `Asset: "${base.name}"
Testo originale:
${context}
${flowsContext}
Classifica secondo la tassonomia sopra.`;

        const fullPrompt = `System: ${systemPrompt}\nUser: ${userPrompt}`;
        console.log(`      📝 Prompt inviato (modello ${config.ollama.model}):`);
        console.log(`      ${fullPrompt.substring(0, 500)}${fullPrompt.length > 500 ? '...' : ''}`);

        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.2, num_predict: 512 });
            const jsonString = extractFirstJSON(response);
            const parsed = JSON.parse(jsonString);
            console.log(`      ✅ Risposta: category=${parsed.category}, subCategory=${parsed.subCategory}`);

            const adv = {
                id: existing.find(a => a.originalAssetId === base.id)?.id || uuidv4(),
                originalAssetId: base.id,
                name: base.name,
                category: parsed.category || '',
                subCategory: parsed.subCategory || '',
                description: parsed.description || '',
                contextChunk: context
            };

            const idx = existing.findIndex(a => a.originalAssetId === base.id);
            if (idx !== -1) existing[idx] = adv;
            else existing.push(adv);
            enriched.push(adv);
        } catch (err) {
            console.error(`      ❌ Errore: ${err.message}`);
        }
    }

    await saveAdvanced(existing);
    console.log(`\n✅ Arricchiti ${enriched.length} asset`);
    res.json(enriched);
});

router.post('/advanced-assets/:id/enhance', async (req, res) => {
    const assets = await loadAdvanced();
    const asset = assets.find(a => a.id === req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset non trovato' });
    const config = await loadConfig();
    if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

    console.log(`\n✨ [ENHANCE] Asset ID: ${req.params.id}`);
    const systemPrompt = `Migliora descrizione dell'asset "${asset.name}" (categoria ${asset.category}). Restituisci JSON: {"description": "..."}`;
    const userPrompt = `Testo originale:\n${asset.contextChunk || ''}\nDescrizione attuale: ${asset.description || ''}`;

    try {
        const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.2 });
        const parsed = JSON.parse(extractFirstJSON(response));
        if (parsed.description) asset.description = parsed.description;
        await saveAdvanced(assets);
        res.json({ success: true, asset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;