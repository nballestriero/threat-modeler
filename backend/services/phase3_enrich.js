const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const { getCategoryNames, getSubcategoryNames } = require('../utils/taxonomyUtils');
const { inferCategoryFromName } = require('../utils/inferCategory');

async function phase3Enrich(ctx) {
    const { uniqueAssets, chunks, config, taxonomy, fixedContextRich } = ctx;
    console.log("\n📍 FASE 3: Arricchimento con tassonomia");
    const enrichedAssets = [];

    for (const asset of uniqueAssets) {
        const primaryChunk = chunks[asset.primaryChunkIndex];
        console.log(`   🏷️  Elaborazione: "${asset.name}" (chunk principale ${asset.primaryChunkIndex})`);
        const categoriesWithDesc = taxonomy.categories.map(c => `${c.name}: ${c.description}`).join('\n');
        const systemPrompt = `Sei un classificatore di asset per threat modeling.
Categorie disponibili (con descrizione):
${categoriesWithDesc}

Per ogni categoria esistono sottocategorie predefinite. Non inventare nuove sottocategorie.
Rispondi SOLO con un JSON valido in questo formato:
{"category": "stringa (nome categoria)", "subCategory": "stringa (sottocategoria valida)", "description": "descrizione oggettiva"}

REGOLE:
- Descrizione OGGETTIVA (cosa è, a cosa serve), senza minacce.
- Scegli la sottocategoria più appropriata tra quelle della categoria scelta.`;

        let userPrompt = `Testo originale da cui è stato estratto l'asset:
"""
${primaryChunk}
"""

Nome asset: "${asset.name}"

Classifica questo asset: scegli CATEGORIA (tra quelle elencate), SOTTOCATEGORIA (valida per quella categoria) e scrivi una descrizione OGGETTIVA.`;

        if (fixedContextRich) {
            userPrompt = `Contesto aggiuntivo (fornito dall'utente):\n${fixedContextRich}\n\n` + userPrompt;
        }

        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.2, num_predict: 512 });
            const jsonString = extractFirstJSON(response);
            if (!jsonString) throw new Error('Nessun JSON');
            const parsed = JSON.parse(jsonString);

            let category = getCategoryNames(taxonomy).find(c => c.toLowerCase() === parsed.category?.toLowerCase());
            if (!category) {
                console.warn(`      ⚠️ Categoria non valida "${parsed.category}", inferisco...`);
                category = inferCategoryFromName(asset.name);
            }

            const validSubcats = getSubcategoryNames(taxonomy, category);
            let subCategory = "";
            if (parsed.subCategory && validSubcats.includes(parsed.subCategory)) {
                subCategory = parsed.subCategory;
            } else if (parsed.subCategory) {
                const found = validSubcats.find(sc => sc.toLowerCase() === parsed.subCategory.toLowerCase());
                if (found) subCategory = found;
                else if (validSubcats.length) subCategory = validSubcats[0];
                if (subCategory) console.warn(`      ⚠️ Sottocategoria corretta a "${subCategory}"`);
            } else if (validSubcats.length) {
                subCategory = validSubcats[0];
            }

            let description = parsed.description || `Asset: ${asset.name}`;
            const attackKeywords = ['attacco', 'minaccia', 'spoofing', 'tampering', 'repudiation', 'information disclosure', 'denial of service', 'elevation of privilege', 'sql injection', 'xss', 'attaccante', 'vulnerabile', 'exploit'];
            if (attackKeywords.some(kw => description.toLowerCase().includes(kw))) {
                console.warn(`      ⚠️ Descrizione contiene attacchi, uso generica.`);
                description = `Asset: ${asset.name} (categoria ${category}).`;
            }

            enrichedAssets.push({
                name: asset.name,
                category,
                subCategory,
                description,
                contextChunk: primaryChunk.substring(0, 1500)
            });
            console.log(`      ✅ → ${category} / ${subCategory || 'generica'}`);
        } catch (err) {
            console.error(`      ❌ Errore per "${asset.name}":`, err.message);
            const fallbackCat = inferCategoryFromName(asset.name);
            enrichedAssets.push({
                name: asset.name,
                category: fallbackCat,
                subCategory: getSubcategoryNames(taxonomy, fallbackCat)[0] || "",
                description: `Asset: ${asset.name}`,
                contextChunk: primaryChunk.substring(0, 1500)
            });
        }
    }
    console.log(`   📊 Arricchiti ${enrichedAssets.length} asset`);
    ctx.enrichedAssets = enrichedAssets;
    ctx.logs.push(`Fase3: arricchiti ${enrichedAssets.length} asset`);
    return ctx;
}

module.exports = phase3Enrich;