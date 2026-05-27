const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const { getCategoryNames } = require('../utils/taxonomyUtils');

async function phase1Extract(ctx) {
    const { chunks, config, taxonomy } = ctx;
    console.log("\n📍 FASE 1: Estrazione asset grezzi (nome + chunk ID)");
    const categoriesList = getCategoryNames(taxonomy).join(', ');
    const systemPrompt = `Sei un estrattore di asset tecnici.
Leggi il testo e restituisci SOLO un array JSON di oggetti con un campo "name".
Categorie accettate: ${categoriesList}
Includi nomi di modelli, dataset, database, API, servizi, percorsi di file (es. "data/images/").
Esempio: [{"name": "EfficientNet-B4"}, {"name": "data/images/"}, {"name": "ChromaDB"}]
Se non trovi asset, restituisci [].`;

    const rawOccurrences = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   🔎 Analisi chunk ${i + 1}/${chunks.length} (${chunk.length} caratteri)...`);
        const userPrompt = `Testo da analizzare:\n${chunk}`;
        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.1, num_predict: 256 });
            const jsonString = extractFirstJSON(response);
            if (!jsonString) {
                console.warn(`      ⚠️ Nessun JSON trovato, salto chunk.`);
                continue;
            }
            const parsed = JSON.parse(jsonString);
            let assetsInChunk = Array.isArray(parsed) ? parsed : (parsed.name ? [parsed] : []);
            for (const a of assetsInChunk) {
                if (a.name && a.name.trim()) {
                    rawOccurrences.push({ name: a.name.trim(), chunkIndex: i });
                }
            }
            console.log(`      → Trovati ${assetsInChunk.length} asset grezzi nel chunk.`);
        } catch (err) {
            console.error(`      ❌ Errore nel chunk ${i + 1}:`, err.message);
        }
    }
    console.log(`   📊 Asset grezzi totali rilevati: ${rawOccurrences.length}`);
    ctx.rawOccurrences = rawOccurrences;
    ctx.logs.push(`Fase1: trovati ${rawOccurrences.length} asset grezzi`);
    return ctx;
}

module.exports = phase1Extract;