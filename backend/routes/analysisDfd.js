const express = require('express');
const router = express.Router();
const { loadConfig } = require('../utils/configUtils');
const { extractText } = require('../utils/fileUtils');
const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const fsSync = require('fs');
const path = require('path');

// Tassonomia DFD base (semplificata)
const DFD_CATEGORIES = ['External Entity', 'Process', 'Data Store'];

router.post('/analyze/extract-assets-dfd', async (req, res) => {
    console.log("\n🔍 [DFD BASE] AVVIO ANALISI SEMPLIFICATA");
    const { docFiles, contextFiles } = req.body;
    const config = await loadConfig();

    console.log(`   📂 Documenti da analizzare: ${docFiles?.length || 0}`);
    console.log(`   📚 File di contesto: ${contextFiles?.length || 0}`);

    if (!config.ollama.enabled) {
        console.error("❌ LLM non abilitato.");
        return res.status(400).json({ error: 'LLM non abilitato.' });
    }
    console.log(`   🤖 Modello: ${config.ollama.model} @ ${config.ollama.baseUrl}`);

    // Carica contesto (solo per fase3)
    let fixedContext = "";
    if (contextFiles && contextFiles.length) {
        console.log("   📥 Caricamento file di contesto...");
        for (const fPath of contextFiles) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                const truncated = text.length > 3000 ? text.substring(0, 3000) + "…" : text;
                fixedContext += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${truncated}\n`;
            }
        }
        console.log(`   ✅ Contesto caricato: ${fixedContext.length} caratteri.`);
    } else {
        console.log("   ℹ️ Nessun file di contesto.");
    }

    // Testo principale
    let mainDocText = "";
    for (const fPath of (docFiles || [])) {
        if (fsSync.existsSync(fPath)) {
            const text = await extractText(fPath, path.extname(fPath));
            console.log(`   📄 Estratto da ${path.basename(fPath)}: ${text.length} caratteri`);
            mainDocText += `\n--- DOCUMENTO: ${path.basename(fPath)} ---\n${text}\n`;
        }
    }
    if (!mainDocText.trim()) {
        console.error("❌ Nessun testo estratto.");
        return res.status(400).json({ error: 'Nessun testo estratto dai documenti principali.' });
    }
    console.log(`   📄 Testo totale: ${mainDocText.length} caratteri.`);

    // Chunking
    const CHUNK_SIZE = 2000;
    const OVERLAP = 300;
    const chunks = [];
    for (let i = 0; i < mainDocText.length; i += CHUNK_SIZE - OVERLAP) {
        let chunk = mainDocText.substring(i, i + CHUNK_SIZE);
        if (i + CHUNK_SIZE < mainDocText.length) {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > CHUNK_SIZE * 0.7) chunk = chunk.substring(0, lastSpace);
        }
        chunks.push(chunk);
    }
    console.log(`   ✂️ Documento suddiviso in ${chunks.length} chunk (dimensione ~${CHUNK_SIZE} caratteri).`);

    // Prompt semplificato per DFD base
    const categoriesList = DFD_CATEGORIES.join(', ');
    const systemPrompt = `Sei un estrattore di asset per un Data Flow Diagram.
Leggi il testo e restituisci SOLO un array JSON di oggetti con due campi: "name" (stringa) e "dfdType" (stringa).
Categorie possibili: ${categoriesList}.
Esempio: [{"name": "Cliente", "dfdType": "External Entity"}, {"name": "Database clienti", "dfdType": "Data Store"}]
Se non trovi asset, restituisci [].`;

    const rawAssets = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   🔄 Analisi chunk ${i + 1}/${chunks.length} (${chunk.length} caratteri)...`);
        let userPrompt = chunk;
        if (fixedContext) userPrompt = `Contesto aggiuntivo:\n${fixedContext}\n\nTesto:\n${chunk}`;
        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.1, num_predict: 256 });
            const jsonString = extractFirstJSON(response);
            if (!jsonString) {
                console.warn(`      ⚠️ Nessun JSON trovato, salto chunk.`);
                continue;
            }
            const parsed = JSON.parse(jsonString);
            let assetsInChunk = Array.isArray(parsed) ? parsed : (parsed.name ? [parsed] : []);
            let validCount = 0;
            for (const a of assetsInChunk) {
                if (a.name && a.dfdType && DFD_CATEGORIES.includes(a.dfdType)) {
                    rawAssets.push({
                        name: a.name,
                        dfdType: a.dfdType,
                        description: `${a.dfdType}: ${a.name}`,
                        contextChunk: chunk.substring(0, 1500)
                    });
                    validCount++;
                }
            }
            console.log(`      → Trovati ${assetsInChunk.length} asset (${validCount} validi).`);
        } catch (err) {
            console.error(`      ❌ Errore nel chunk ${i + 1}:`, err.message);
        }
    }

    // Deduplica per nome
    const unique = new Map();
    for (const asset of rawAssets) {
        const key = asset.name.toLowerCase();
        if (!unique.has(key)) unique.set(key, asset);
    }
    const finalAssets = Array.from(unique.values());
    console.log(`   📊 Asset grezzi: ${rawAssets.length}, unici: ${finalAssets.length}`);
    console.log("🏁 ANALISI DFD BASE TERMINATA.\n");

    res.json({
        assets: finalAssets,
        count: finalAssets.length,
        chunksProcessed: chunks.length
    });
});

module.exports = router;