// backend/routes/analysis.js
const express = require('express');
const router = express.Router();
const { runAnalysisPipeline } = require('../services/analysisOrchestrator');
const { AnalysisContext } = require('../services/analysisContext');
const { extractText } = require('../utils/fileUtils');
const { loadConfig } = require('../utils/configUtils');
const fsSync = require('fs');
const path = require('path');

const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');
let TAXONOMY = null;
try {
    TAXONOMY = JSON.parse(fsSync.readFileSync(TAXONOMY_PATH, 'utf-8'));
} catch (e) { /* handled later */ }

router.post('/analyze/extract-assets', async (req, res) => {
    const { docFiles, contextFiles } = req.body;
    const config = await loadConfig();

    if (!config.ollama.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato.' });
    }

    // Carica contesto (solo per fase3)
    let fixedContextRich = "";
    if (contextFiles && contextFiles.length) {
        for (const fPath of contextFiles) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                const truncated = text.length > 3000 ? text.substring(0, 3000) + "…" : text;
                fixedContextRich += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${truncated}\n`;
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
    if (!mainDocText.trim()) {
        return res.status(400).json({ error: 'Nessun testo estratto dai documenti principali.' });
    }

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

    let taxonomy = TAXONOMY;
    if (!taxonomy) {
        const raw = fsSync.readFileSync(TAXONOMY_PATH, 'utf-8');
        taxonomy = JSON.parse(raw);
    }
    const ctx = new AnalysisContext({
        config,
        taxonomy,
        docFiles,
        contextFiles,
        fixedContextRich,
        chunks
    });

    const finalCtx = await runAnalysisPipeline(ctx);
    res.json({
        assets: finalCtx.finalAssets,
        count: finalCtx.finalAssets.length,
        chunksProcessed: finalCtx.chunks.length,
        rawOccurrences: finalCtx.rawOccurrences.length,
        uniqueDetected: finalCtx.uniqueAssets.length
    });
});

module.exports = router;