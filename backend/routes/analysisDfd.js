const express = require('express');
const router = express.Router();
const { loadConfig } = require('../utils/configUtils');
const { extractText } = require('../utils/fileUtils');
const { callOllama, extractFirstJSON } = require('../utils/llmUtils');
const { getEmbedding } = require('../utils/embeddingUtils');
const { createCollection, addEmbeddings } = require('../utils/chromaV2Utils');
const fsSync = require('fs');
const path = require('path');

const DFD_CATEGORIES = ['External Entity', 'Process', 'Data Store'];

router.post('/analyze/extract-assets-dfd', async (req, res) => {
    console.log("\n🔍 [DFD BASE] AVVIO ANALISI SEMPLIFICATA");
    const { docFiles, contextFiles } = req.body;
    const config = await loadConfig();

    if (!config.ollama.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato.' });
    }

    // Contesto statico
    let fixedContext = "";
    if (contextFiles?.length) {
        for (const fPath of contextFiles) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                fixedContext += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${text.substring(0, 3000)}\n`;
            }
        }
    }

    // Testo principale
    let mainDocText = "";
    for (const fPath of (docFiles || [])) {
        if (fsSync.existsSync(fPath)) {
            const text = await extractText(fPath, path.extname(fPath));
            mainDocText += `\n--- DOCUMENTO: ${path.basename(fPath)} ---\n${text}\n`;
        }
    }
    if (!mainDocText.trim()) return res.status(400).json({ error: 'Nessun testo estratto.' });

    // Chunking
    const CHUNK_SIZE = 2000, OVERLAP = 300;
    const chunks = [];
    for (let i = 0; i < mainDocText.length; i += CHUNK_SIZE - OVERLAP) {
        let chunk = mainDocText.substring(i, i + CHUNK_SIZE);
        if (i + CHUNK_SIZE < mainDocText.length) {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > CHUNK_SIZE * 0.7) chunk = chunk.substring(0, lastSpace);
        }
        chunks.push(chunk);
    }

    // RAG: indicizzazione opzionale
    let ragCollectionId = null;
    if (config.rag?.enabled) {
        try {
            const prefix = config.rag.collectionPrefix || 'threatmodel_';
            const docId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            const collName = `${prefix}${docId}`;
            const { id: collId } = await createCollection(config.rag.baseUrl, collName);
            ragCollectionId = collId;
            const embeddings = [];
            for (const chunk of chunks) {
                const emb = await getEmbedding(chunk, config.ollama.baseUrl, config.rag.embeddingModel);
                embeddings.push(emb);
            }
            const ids = chunks.map((_, idx) => `${docId}_chunk_${idx}`);
            const metadatas = chunks.map(() => ({ docId, sourceFiles: docFiles }));
            await addEmbeddings(config.rag.baseUrl, collId, ids, embeddings, metadatas, chunks);
            console.log(`✅ Indicizzati ${chunks.length} chunk in ChromaDB`);
        } catch (err) {
            console.error('⚠️ Indicizzazione RAG fallita:', err.message);
        }
    }

    // Estrazione asset con prompt semplificato
    const systemPrompt = `Sei un estrattore di asset per DFD.
Categorie: ${DFD_CATEGORIES.join(', ')}.
Restituisci solo JSON: [{"name": "...", "dfdType": "..."}]`;

    const rawAssets = [];
    for (let i = 0; i < chunks.length; i++) {
        let userPrompt = chunks[i];
        if (fixedContext) userPrompt = `Contesto:\n${fixedContext}\n\nTesto:\n${chunks[i]}`;
        try {
            const response = await callOllama(config, systemPrompt, userPrompt, { temperature: 0.1 });
            const jsonString = extractFirstJSON(response);
            if (!jsonString) continue;
            const parsed = JSON.parse(jsonString);
            const assetsInChunk = Array.isArray(parsed) ? parsed : (parsed.name ? [parsed] : []);
            for (const a of assetsInChunk) {
                if (a.name && DFD_CATEGORIES.includes(a.dfdType)) {
                    rawAssets.push({
                        name: a.name,
                        category: a.dfdType,
                        description: `${a.dfdType}: ${a.name}`,
                        contextChunk: chunks[i].substring(0, 1500)
                    });
                }
            }
        } catch (err) { console.error(`Chunk ${i} errore:`, err.message); }
    }

    // Deduplica
    const unique = new Map();
    for (const a of rawAssets) unique.set(a.name.toLowerCase(), a);
    const finalAssets = Array.from(unique.values());

    console.log(`📊 Asset finali: ${finalAssets.length}`);
    res.json({ assets: finalAssets, count: finalAssets.length, ragCollectionId });
});

module.exports = router;