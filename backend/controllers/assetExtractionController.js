/**
 * @file Controller per l'estrazione di asset via pipeline LLM
 * @module controllers/assetExtractionController
 */

const { AssetExtractionPipeline } = require('../services/assetExtractionPipeline');
const assetService = require('../services/assetService');
const { loadConfig } = require('../utils/configUtils');

/**
 * Gestisce la richiesta POST /api/analyze/extract-assets
 * @async
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @returns {Promise<void>}
 */
async function extractAssets(req, res) {
    console.log('📥 [CONTROLLER] Richiesta ricevuta:', JSON.stringify(req.body, null, 2));

    const { files, contextFiles, methodology, options } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array è obbligatorio' });
    }
    if (!methodology) {
        return res.status(400).json({ error: 'methodology è obbligatorio' });
    }

    try {
        // Usa la configurazione già caricata in app.locals o caricala se manca
        let config = req.app.locals.config;
        if (!config) {
            console.warn('⚠️ Config non trovata in app.locals, carico manualmente...');
            config = await loadConfig();
            req.app.locals.config = config;
        }
        console.log('✅ [CONTROLLER] Configurazione caricata:', JSON.stringify(config.ollama));

        const pipeline = new AssetExtractionPipeline(config);
        console.log('🚀 [CONTROLLER] Pipeline creata, avvio estrazione...');
        const result = await pipeline.extract({ files, contextFiles, methodology, options });
        console.log(`✅ [CONTROLLER] Estrazione completata: ${result.assets.length} asset, raw=${result.rawOccurrences}, chunks=${result.chunksProcessed}`);

        const { saved, duplicates } = await assetService.importAssets(result.assets);
        console.log(`💾 [CONTROLLER] Import: ${saved} nuovi, ${duplicates} duplicati`);

        res.json({
            success: true,
            assets: result.assets,
            count: result.assets.length,
            rawOccurrences: result.rawOccurrences,
            saved,
            duplicates,
            chunksProcessed: result.chunksProcessed,
            message: `✅ Estratti ${result.assets.length} asset (${saved} nuovi, ${duplicates} duplicati)`
        });
    } catch (err) {
        console.error('❌ [CONTROLLER] Errore interno:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { extractAssets };