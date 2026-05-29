/**
 * @file Orchestratore principale per l'estrazione di asset da documenti
 * @module services/assetExtractionPipeline
 */

const textExtractor = require('./textExtractorService');
const chunkService = require('./chunkService');
const ollamaService = require('./ollamaService');
const { RagService } = require('./ragService');
const methodologyService = require('./methodologyService');
const assetMergeService = require('./assetMergeService');

class AssetExtractionPipeline {
    constructor(config) {
        this.config = config;
        if (config.rag?.enabled) {
            this.ragService = new RagService(config);
            console.log('🧠 [PIPELINE] RAG Service inizializzato (modalità:', config.rag.mode, ')');
        }
    }

    async extract({ files, contextFiles = [], methodology, options = {} }) {
        const { useChunking = true, maxChunkSize = 1500, chunkOverlap = 150 } = options;
        const useRag = !!this.ragService;
        console.log(`🚀 [PIPELINE] Avvio estrazione: files=${files.length}, useChunking=${useChunking}, useRag=${useRag}`);

        // 1. Estrai testo
        let mainText = '';
        for (const file of files) {
            console.log(`📄 [PIPELINE] Estraggo testo da: ${file}`);
            const text = await textExtractor.extractTextFromFile(file);
            mainText += `\n--- ${file} ---\n${text}\n`;
        }
        if (!mainText.trim()) throw new Error('Nessun testo estratto');

        // 2. Indicizza file di contesto se RAG attivo
        if (useRag && contextFiles.length > 0) {
            console.log(`📥 [PIPELINE] Indicizzazione di ${contextFiles.length} file di contesto in RAG...`);
            const docs = [];
            for (const file of contextFiles) {
                const text = await textExtractor.extractTextFromFile(file);
                docs.push({ id: file, text, metadata: { source: file } });
            }
            if (docs.length) {
                const collectionName = `methodology_${methodology}`;
                await this.ragService.ingest(collectionName, docs);
                console.log('✅ [PIPELINE] Indicizzazione completata.');
            }
        }

        // 3. Chunking
        let chunks;
        if (useChunking) {
            chunks = chunkService.splitTextIntoChunks(mainText, maxChunkSize, chunkOverlap);
            console.log(`📦 [PIPELINE] Testo suddiviso in ${chunks.length} chunk (max ${maxChunkSize} car, overlap ${chunkOverlap})`);
        } else {
            chunks = [{ index: 0, content: mainText }];
            console.log(`📦 [PIPELINE] Chunking disabilitato: 1 chunk unico`);
        }

        // 4. Tassonomia per RAG
        let taxonomy = null;
        if (useRag) {
            try {
                taxonomy = await methodologyService.loadTaxonomy(methodology);
                console.log(`📚 [PIPELINE] Tassonomia caricata per metodologia ${methodology}`);
            } catch (err) {
                console.warn(`⚠️ [PIPELINE] Impossibile caricare tassonomia: ${err.message}`);
            }
        }

        // 5. Processa chunk
        const allRawAssets = [];
        let chunkIndex = 0;
        for (const chunk of chunks) {
            console.log(`🔄 [PIPELINE] Elaborazione chunk ${chunkIndex + 1}/${chunks.length}`);
            let ragContext = '';
            if (useRag && this.ragService) {
                console.log(`   🔍 [PIPELINE] Query RAG per chunk ${chunkIndex}...`);
                const collectionName = `methodology_${methodology}`;
                try {
                    const result = await this.ragService.query(collectionName, chunk.content, taxonomy, 3);
                    ragContext = result.documents.join('\n');
                    if (ragContext) {
                        console.log(`   📖 [PIPELINE] Contesto RAG trovato (${result.documents.length} documenti, primi 200 car: ${ragContext.substring(0, 200)}...)`);
                    } else {
                        console.log(`   📭 [PIPELINE] Nessun contesto RAG recuperato.`);
                    }
                } catch (err) {
                    console.error(`   ❌ [PIPELINE] Errore nella query RAG:`, err.message);
                }
            }
            const prompt = await methodologyService.buildExtractionPrompt(methodology, chunk.content, ragContext);
            const response = await ollamaService.callOllama(prompt, this.config);
            const assets = this.parseLlmResponse(response, chunk.index);
            console.log(`   ✅ [PIPELINE] Chunk ${chunkIndex}: estratti ${assets.length} asset raw`);
            allRawAssets.push(...assets);
            chunkIndex++;
        }

        // 6. Merge asset simili
        console.log(`🔀 [PIPELINE] Merging di ${allRawAssets.length} asset raw...`);
        const uniqueAssets = assetMergeService.mergeAssetsBySimilarity(allRawAssets);
        console.log(`✅ [PIPELINE] Estrazione completata: ${uniqueAssets.length} asset unici, ${allRawAssets.length} occorrenze raw, ${chunks.length} chunk`);

        return {
            assets: uniqueAssets,
            rawOccurrences: allRawAssets.length,
            chunksProcessed: chunks.length
        };
    }

    parseLlmResponse(response, chunkIndex) {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn(`⚠️ [PIPELINE] Nessun array JSON trovato per chunk ${chunkIndex}`);
                return [];
            }
            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(a => a?.name && a?.category && a.name.length >= 2)
                .map(a => ({
                    name: a.name.trim(),
                    category: a.category.trim(),
                    description: (a.description || '').trim(),
                    source: 'llm-extraction',
                    chunkIndex
                }));
        } catch (err) {
            console.warn(`⚠️ [PIPELINE] Parsing fallito per chunk ${chunkIndex}:`, err.message);
            return [];
        }
    }
}

module.exports = { AssetExtractionPipeline };