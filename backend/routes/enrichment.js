const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { loadConfig } = require('../utils/configUtils');
const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const { loadModel } = require('../models/assetModel');
const { loadAdvanced, saveAdvanced } = require('./advancedAssets');

router.post('/analyze/enrich-assets', async (req, res) => {
    const { assetIds } = req.body;
    console.log('\n🔍 [ENRICH] Avvio arricchimento batch');
    const config = await loadConfig();
    if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

    const model = await loadModel();
    let baseAssets = model.assets;
    if (assetIds?.length) baseAssets = baseAssets.filter(a => assetIds.includes(a.id));

    const existing = await loadAdvanced();
    const enriched = [];

    for (const base of baseAssets) {
        console.log(`   🏷️  Asset: ${base.name}`);
        const context = base.contextChunk || '';
        const systemPrompt = `Categorie: Data, Models, Infrastructure, Actors, Processes, Tools, Artefacts.
Restituisci JSON: {"category":"...","subCategory":"...","description":"..."}`;
        const userPrompt = `Asset: ${base.name}\nTesto:\n${context}`;

        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.2 });
            const parsed = JSON.parse(extractFirstJSON(response));
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
        } catch (err) { console.error(`   ❌ ${base.name}:`, err.message); }
    }
    await saveAdvanced(existing);
    console.log(`✅ Arricchiti ${enriched.length} asset`);
    res.json(enriched);
});

router.post('/advanced-assets/:id/enhance', async (req, res) => {
    const assets = await loadAdvanced();
    const asset = assets.find(a => a.id === req.params.id);
    if (!asset) return res.status(404).json({ error: 'Non trovato' });
    const config = await loadConfig();
    if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

    const prompt = `Migliora la descrizione dell'asset "${asset.name}" (categoria ${asset.category}). Restituisci JSON: {"description":"..."}`;
    try {
        const response = await callOllama(config, prompt, `Testo originale:\n${asset.contextChunk || ''}`, { temperature: 0.2 });
        const parsed = JSON.parse(extractFirstJSON(response));
        if (parsed.description) asset.description = parsed.description;
        await saveAdvanced(assets);
        res.json({ success: true, asset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;