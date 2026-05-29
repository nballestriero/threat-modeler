// backend/routes/analysisDfd.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const fsSync = require('fs');
const router = express.Router();

const { loadConfig } = require('../utils/configUtils');
const { loadModel, saveModel } = require('../models/assetModel');
const { extractText } = require('../utils/fileUtils');
const { v4: uuidv4 } = require('uuid');

// USA LA TASSONOMIA DFD
const TAXONOMY_PATH = path.join(__dirname, '../context/dfd-taxonomy.json');
let TAXONOMY_CACHE = null;

// Helper per log memoria
function logMemory(label) {
    const usage = process.memoryUsage();
    console.log(`📊 [MEM:${label}] RSS=${Math.round(usage.rss / 1024 / 1024)}MB, HeapUsed=${Math.round(usage.heapUsed / 1024 / 1024)}MB, HeapTotal=${Math.round(usage.heapTotal / 1024 / 1024)}MB`);
}

function logConfig(config, source) {
    console.log(`🔧 [CONFIG da ${source}] Ollama enabled=${config.ollama?.enabled}, baseUrl=${config.ollama?.baseUrl}, model=${config.ollama?.model}`);
    console.log(`🔧 [CONFIG] RAG enabled=${config.rag?.enabled}, mode=${config.rag?.mode}, baseUrl=${config.rag?.baseUrl}, collectionPrefix=${config.rag?.collectionPrefix}`);
}

// ============================================================================
// 🔤 SIMILARITÀ CON TRIGRAMMI
// ============================================================================
function getTrigrams(str) {
    const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    const trigrams = new Set();
    for (const word of words) {
        if (word.length >= 3) {
            for (let i = 0; i <= word.length - 3; i++) {
                trigrams.add(word.slice(i, i + 3));
            }
        } else {
            trigrams.add(word);
        }
    }
    return trigrams;
}

function calculateStringSimilarity(a, b) {
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;
    const trigramsA = getTrigrams(a);
    const trigramsB = getTrigrams(b);
    if (trigramsA.size === 0 && trigramsB.size === 0) return 1.0;
    const intersection = new Set([...trigramsA].filter(x => trigramsB.has(x)));
    const union = new Set([...trigramsA, ...trigramsB]);
    return intersection.size / union.size;
}

// ============================================================================
// 🧩 SPLIT IN CHUNK (VERSIONE SEMPLICE E CORRETTA)
// ============================================================================
function splitTextIntoChunks(text, maxChars = 1500, overlapChars = 150) {
    if (!text) return [];
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;
    while (start < text.length) {
        let end = start + maxChars;
        if (end > text.length) end = text.length;
        const content = text.substring(start, end).trim();
        if (content) {
            chunks.push({
                index: chunkIndex++,
                startChar: start,
                endChar: end,
                content: content
            });
        }
        // Avanza: inizia dopo la fine meno overlap
        let nextStart = end - overlapChars;
        if (nextStart <= start) nextStart = end; // evita loop
        start = nextStart;
        if (start >= text.length) break;
    }
    console.log(`📦 [CHUNK] Creati ${chunks.length} chunk (max ${maxChars} car, overlap ${overlapChars})`);
    return chunks;
}

// ============================================================================
// 🤖 OLLAMA CON TIMEOUT AUMENTATO
// ============================================================================
async function callOllama(prompt, config, options = {}) {
    const { baseUrl, model, timeout = 120000 } = config.ollama || {};
    const payload = {
        model: model || 'llama3.1:8b',
        messages: [
            { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
            temperature: options.temperature || 0.1,
            num_predict: options.numPredict || 512,
            stop: ['\n```', '```']
        }
    };
    try {
        console.log(`   📡 [OLLAMA] Chiamata a ${baseUrl}/api/chat con model ${payload.model}, timeout=${timeout}ms`);
        const response = await axios.post(`${baseUrl}/api/chat`, payload, {
            timeout,
            headers: { 'Content-Type': 'application/json' }
        });
        let content = response.data.message?.content || '';
        if (content.length > 10000) {
            console.warn(`   ⚠️ [OLLAMA] Risposta TRONCATA: ${content.length} caratteri → limitata a 10000`);
            content = content.substring(0, 10000);
        } else {
            console.log(`   📊 [OLLAMA] Risposta ricevuta: ${content.length} caratteri`);
        }
        return content;
    } catch (err) {
        console.error(`   ❌ Errore chiamata Ollama: ${err.message}`);
        throw new Error(`LLM non disponibile: ${err.message}`);
    }
}

// ============================================================================
// 📝 PROMPT PER CHUNK (usa tassonomia DFD)
// ============================================================================
function buildChunkPrompt(chunkContent, taxonomy, ragContext = '') {
    const categories = taxonomy?.categories?.map(c => c.name).join(', ') || 'External Entity, Process, Data Store, Data Flow, Trust Boundary';
    const categoryDefs = taxonomy?.categories?.map(c => `- ${c.name}: ${c.description || ''}`).join('\n') || '';
    return `
Sei un esperto di threat modeling e DFD. Analizza il frammento ed estrai gli asset.

CATEGORIE VALIDE: ${categories}
DEFINIZIONI:
${categoryDefs}

ISTRUZIONI:
- Solo asset chiaramente menzionati in QUESTO frammento.
- name breve (1-3 parole), category una delle sopra, description una frase.
- Nomi specifici (es. "Database Pazienti", non "Database").
- Se nessun asset, restituisci [].
- Restituisci SOLO JSON array.

FORMATO: [{"name": "...", "category": "...", "description": "..."}]

${ragContext ? `CONTESTO RAG:\n${ragContext.substring(0, 1000)}\n` : ''}

FRAMMENTO:
---
${chunkContent.substring(0, 2500)}
---

OUTPUT JSON:
`.trim();
}

// ============================================================================
// 🧹 PARSING RISPOSTA
// ============================================================================
function parseLlmResponse(response, chunkIndex) {
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn(`   ⚠️ [CHUNK ${chunkIndex}] Nessun array JSON trovato`);
            return [];
        }
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(a => a?.name && a?.category && a.name.length >= 2)
            .map(a => ({
                name: a.name.trim().replace(/\s+/g, ' '),
                category: a.category.trim(),
                description: (a.description || '').trim(),
                source: 'llm-extraction',
                chunkIndex: chunkIndex
            }));
    } catch (err) {
        console.warn(`   ⚠️ [CHUNK ${chunkIndex}] Errore parsing JSON: ${err.message}`);
        return [];
    }
}

// ============================================================================
// 🧠 ESTRAZIONE PER SINGOLO CHUNK
// ============================================================================
async function extractAssetsFromChunk(chunk, taxonomy, config, globalRagContext = '') {
    const prompt = buildChunkPrompt(chunk.content, taxonomy, globalRagContext);
    try {
        const response = await callOllama(prompt, config, {
            systemPrompt: 'You are a security analyst. Output ONLY valid JSON array. Keep it short.',
            temperature: 0.1,
            numPredict: 512
        });
        const assets = parseLlmResponse(response, chunk.index);
        if (assets.length === 0) {
            console.log(`   📭 [CHUNK ${chunk.index}] Nessun asset.`);
        } else {
            console.log(`   ✅ [CHUNK ${chunk.index}] Estratti ${assets.length} asset.`);
        }
        return assets;
    } catch (err) {
        console.error(`   ❌ [CHUNK ${chunk.index}] Errore: ${err.message}`);
        return [];
    }
}

// ============================================================================
// 🔀 MERGING PER SIMILARITÀ
// ============================================================================
function mergeAssetsBySimilarity(assetsFromAllChunks) {
    if (!assetsFromAllChunks.length) return [];
    const groups = new Map();
    for (const asset of assetsFromAllChunks) {
        const key = asset.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(asset);
    }
    const merged = [];
    const processed = new Set();
    const keys = Array.from(groups.keys());
    for (let i = 0; i < keys.length; i++) {
        if (processed.has(keys[i])) continue;
        const similarKeys = [keys[i]];
        for (let j = i + 1; j < keys.length; j++) {
            if (processed.has(keys[j])) continue;
            if (calculateStringSimilarity(keys[i], keys[j]) > 0.8) {
                similarKeys.push(keys[j]);
                processed.add(keys[j]);
            }
        }
        processed.add(keys[i]);
        const mergedAssets = [];
        for (const k of similarKeys) {
            mergedAssets.push(...(groups.get(k) || []));
        }
        const first = mergedAssets[0];
        let bestDescription = first.description;
        for (const a of mergedAssets) {
            if (a.description.length > bestDescription.length) bestDescription = a.description;
        }
        const categoryCounts = new Map();
        for (const a of mergedAssets) {
            categoryCounts.set(a.category, (categoryCounts.get(a.category) || 0) + 1);
        }
        let bestCategory = first.category;
        let maxCount = 0;
        for (const [cat, cnt] of categoryCounts) {
            if (cnt > maxCount) { maxCount = cnt; bestCategory = cat; }
        }
        const uniqueChunks = [...new Set(mergedAssets.map(a => a.chunkIndex).filter(i => i !== undefined))];
        merged.push({
            name: first.name,
            category: bestCategory,
            description: bestDescription,
            source: 'llm-extraction',
            evidence: { chunks: uniqueChunks.map(idx => ({ index: idx })) }
        });
    }
    console.log(`🔀 [MERGE] Da ${assetsFromAllChunks.length} occorrenze a ${merged.length} asset unici`);
    return merged;
}

// ============================================================================
// 💾 SALVATAGGIO
// ============================================================================
async function persistAssetsWithEvidence(newAssets, modelFilePath) {
    if (!newAssets?.length) return { saved: 0, duplicates: 0 };
    try {
        let stats;
        try {
            stats = fsSync.statSync(modelFilePath);
            if (stats.size > 50 * 1024 * 1024) {
                console.error(`❌ File model troppo grande (${Math.round(stats.size / 1024 / 1024)}MB). Non si salva.`);
                return { saved: 0, duplicates: 0, error: 'Model file too large' };
            }
        } catch (e) { /* file non esiste */ }

        const model = await loadModel();
        const existing = new Map();
        for (const a of (model.assets || [])) {
            existing.set((a.name || '').trim().toLowerCase(), a.id);
        }
        const toSave = [];
        let duplicates = 0;
        for (const asset of newAssets) {
            const key = (asset.name || '').trim().toLowerCase();
            if (key.length < 3 || existing.has(key)) {
                duplicates++;
                continue;
            }
            const newAsset = {
                id: uuidv4(),
                createdAt: new Date().toISOString(),
                source: asset.source,
                name: asset.name,
                category: asset.category,
                description: asset.description,
                evidence: asset.evidence || { chunks: [] }
            };
            existing.set(key, newAsset.id);
            toSave.push(newAsset);
        }
        if (toSave.length) {
            model.assets = [...(model.assets || []), ...toSave];
            await saveModel(model);
            console.log(`💾 Salvati ${toSave.length} nuovi, duplicati ${duplicates}`);
        }
        return { saved: toSave.length, duplicates };
    } catch (err) {
        console.error('❌ Errore salvataggio:', err.message);
        return { saved: 0, duplicates: 0, error: err.message };
    }
}

// ============================================================================
// 🔍 RAG QUERY
// ============================================================================
async function queryRAG(queryText, projectId, config) {
    if (!config.rag?.enabled || config.rag.mode !== 'http-server') {
        console.log('   ℹ️ RAG disabilitato o modalità non http-server');
        return '';
    }
    try {
        const baseUrl = config.rag.baseUrl?.replace(/\/$/, '');
        const collection = `${config.rag.collectionPrefix || 'threatmodel_'}${projectId}`;
        console.log(`   📡 [RAG] Query a ${baseUrl}/api/v1/collections/${collection}/query`);
        const resp = await axios.post(`${baseUrl}/api/v1/collections/${collection}/query`, {
            query_texts: [queryText],
            n_results: 2,
            include: ['documents']
        }, { timeout: 10000 });
        const docs = resp.data.documents?.[0] || [];
        if (docs.length) {
            console.log(`   🧠 [RAG] Ottenuti ${docs.length} documenti di contesto`);
            return `\nRAG Context:\n${docs.join('\n').substring(0, 1000)}\n`;
        } else {
            console.log('   📭 [RAG] Nessun documento trovato');
            return '';
        }
    } catch (err) {
        console.warn(`   ⚠️ [RAG] Query fallita: ${err.message}`);
        return '';
    }
}

// ============================================================================
// 📌 ENDPOINT PRINCIPALE
// ============================================================================
router.post('/extract-assets-dfd', async (req, res) => {
    logMemory('INIZIO RICHIESTA');
    const { docFiles, contextFiles, projectId = 'default' } = req.body;

    const config = await loadConfig();
    console.log('\n🔧 === CONFIGURAZIONE CARICATA ===');
    logConfig(config, 'loadConfig()');
    console.log('🔧 ================================\n');

    if (!config.ollama?.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato in configurazione.' });
    }

    try {
        // Carica tassonomia DFD
        let taxonomy = TAXONOMY_CACHE;
        if (!taxonomy) {
            console.log(`📖 Caricamento tassonomia DFD da ${TAXONOMY_PATH}`);
            if (!fsSync.existsSync(TAXONOMY_PATH)) {
                console.error(`❌ File tassonomia non trovato: ${TAXONOMY_PATH}`);
                return res.status(500).json({ error: 'Tassonomia DFD non trovata' });
            }
            taxonomy = JSON.parse(fsSync.readFileSync(TAXONOMY_PATH, 'utf-8'));
            TAXONOMY_CACHE = taxonomy;
            console.log(`✅ Tassonomia DFD caricata: ${taxonomy.categories?.length || 0} categorie`);
        }
        logMemory('Dopo tassonomia');

        // Leggi documenti
        let mainText = '';
        for (const fPath of docFiles || []) {
            if (fsSync.existsSync(fPath)) {
                console.log(`📄 Leggo documento: ${fPath}`);
                const text = await extractText(fPath, path.extname(fPath));
                mainText += `\n--- ${path.basename(fPath)} ---\n${text}\n`;
            } else {
                console.warn(`⚠️ File non trovato: ${fPath}`);
            }
        }
        for (const fPath of contextFiles || []) {
            if (fsSync.existsSync(fPath)) {
                console.log(`📄 Leggo contesto: ${fPath}`);
                const text = await extractText(fPath, path.extname(fPath));
                mainText += `\n--- CONTEXT ${path.basename(fPath)} ---\n${text.substring(0, 2000)}\n`;
            }
        }
        if (!mainText.trim()) {
            return res.status(400).json({ error: 'Nessun testo estratto dai documenti.' });
        }
        console.log(`📄 Testo totale: ${mainText.length} caratteri`);
        logMemory('Dopo lettura documenti');

        // RAG
        let globalRagContext = '';
        if (config.rag?.enabled && config.rag.mode === 'http-server') {
            const query = (docFiles || []).map(f => path.basename(f)).join(' ') + ' DFD assets';
            console.log(`🔍 Query RAG globale: "${query.substring(0, 100)}..."`);
            globalRagContext = await queryRAG(query, projectId, config);
        }

        // Chunking
        console.log('✂️ Splitting in chunk...');
        const chunks = splitTextIntoChunks(mainText, 1500, 150);
        mainText = null;
        if (global.gc) global.gc();
        logMemory('Dopo chunking e rilascio testo');

        if (!chunks.length) {
            return res.status(400).json({ error: 'Nessun chunk generato dal documento.' });
        }
        console.log(`📦 Generati ${chunks.length} chunk. Verranno processati tutti.`);

        let allRawAssets = [];
        let processedCount = 0;
        for (const chunk of chunks) {
            processedCount++;
            console.log(`\n🔄 [CHUNK ${processedCount}/${chunks.length}] Elaborazione...`);
            logMemory(`Prima chunk ${chunk.index}`);
            const assets = await extractAssetsFromChunk(chunk, taxonomy, config, globalRagContext);
            allRawAssets.push(...assets);
            chunk.content = null;
            if (global.gc) global.gc();
            logMemory(`Dopo chunk ${chunk.index} e GC`);
        }
        console.log(`\n📦 Totale occorrenze raccolte: ${allRawAssets.length}`);
        logMemory('Dopo tutti i chunk');

        // Merging
        console.log('🔄 Merging asset simili...');
        const uniqueAssets = mergeAssetsBySimilarity(allRawAssets);
        console.log(`🔀 Asset unici finali: ${uniqueAssets.length}`);

        // Persistenza
        const modelPath = path.join(__dirname, '../threat-model.json');
        console.log(`💾 Salvataggio in ${modelPath}`);
        const { saved, duplicates } = await persistAssetsWithEvidence(uniqueAssets, modelPath);

        return res.json({
            success: true,
            assets: uniqueAssets,
            count: uniqueAssets.length,
            rawOccurrences: allRawAssets.length,
            saved,
            duplicates,
            chunksProcessed: processedCount,
            chunksTotal: chunks.length,
            message: `✅ Estratti ${uniqueAssets.length} asset (${saved} nuovi, ${duplicates} duplicati) da ${processedCount} chunk.`
        });
        logMemory('FINE RICHIESTA');
        console.log('🏁 Richiesta completata\n');

        // Cleanup finale
        allRawAssets = null;
        uniqueAssets = null;
        if (global.gc) global.gc();
    } catch (err) {
        console.error('❌ ERRORE GLOBALE:', err);
        logMemory('ERRORE');
        // Evita di inviare due risposte
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Errore interno', details: err.message });
        }
    }
});

module.exports = router;