// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fsSync = require('fs');
const { ensureUploadDirs } = require('./utils/fileUtils');

const app = express();
app.use(cors());
app.use(express.json());

// Costanti per i file JSON
const JSON_FILE = path.join(__dirname, 'threat-model.json');
const ADVANCED_FILE = path.join(__dirname, 'advanced-assets.json');

// Route normali
const assetsRoutes = require('./routes/assets');
const configRoutes = require('./routes/config');
const filesRoutes = require('./routes/files');
const taxonomyRoutes = require('./routes/taxonomy');
const analysisRoutes = require('./routes/analysis');          // → /api/analyze/extract-assets
const analysisDfdRoutes = require('./routes/analysisDfd');    // → /api/analyze/extract-assets-dfd ✅ FIX
const dfdRoutes = require('./routes/dfd');
const testRoutes = require('./routes/test');
const advancedAssets = require('./routes/advancedAssets');
const enrichmentRoutes = require('./routes/enrichment');
const ragRoutes = require('./routes/rag');
const ollamaRoutes = require('./routes/ollama');

// Caricamento metodologie
const methodologies = require('./methodologies');

// Registra le rotte di ogni metodologia
for (const [name, module] of Object.entries(methodologies)) {
    if (module.router) {
        app.use(`/api/methodologies/${name}`, module.router);
        console.log(`✅ Metodologia ${name} montata su /api/methodologies/${name}`);
    }
}

// Sincronizzazione advanced-assets
if (fsSync.existsSync(JSON_FILE)) {
    try {
        const threatModel = JSON.parse(fsSync.readFileSync(JSON_FILE, 'utf-8'));
        if (threatModel.assets.length === 0 && fsSync.existsSync(ADVANCED_FILE)) {
            fsSync.writeFileSync(ADVANCED_FILE, JSON.stringify([], null, 2));
            console.log('🧹 Advanced assets resettati perché threat-model è vuoto.');
        }
    } catch (err) {
        console.warn('⚠️ Errore lettura threat-model.json');
    }
} else {
    if (fsSync.existsSync(ADVANCED_FILE)) {
        fsSync.writeFileSync(ADVANCED_FILE, JSON.stringify([], null, 2));
        console.log('🧹 Advanced assets resettati (threat-model.json mancante).');
    }
}

// Endpoint per elencare le metodologie
app.get('/api/methodologies', (req, res) => {
    res.json(Object.keys(methodologies));
});

// ============================================================================
// === REGISTRAZIONE ROUTE - FIX CRITICO PER analysisDfdRoutes ===
// ============================================================================

// Route base (montate su /api)
app.use('/api', assetsRoutes);           // → /api/assets, /api/assets/:id
app.use('/api', configRoutes);           // → /api/config (GET/PUT)
app.use('/api', filesRoutes);            // → /api/files/docs, /api/files/csv, /api/files/context
app.use('/api', taxonomyRoutes);         // → /api/taxonomy, /api/dfd-taxonomy
app.use('/api', analysisRoutes);         // → /api/analyze/extract-assets (se interno ha /analyze/...)
app.use('/api', dfdRoutes);              // → /api/dfd/..., /api/flows
app.use('/api', testRoutes);             // → /api/test/ollama, /api/test/db
app.use('/api', advancedAssets.router);  // → /api/advanced-assets/...
app.use('/api', enrichmentRoutes);       // → /api/enrichment/...
app.use('/api', ragRoutes);              // → /api/rag/test-connection, /api/rag/index
app.use('/api', ollamaRoutes);           // → /api/ollama/models, /api/ollama/test

// ✅ FIX CRITICO: analysisDfdRoutes montato su /api/analyze
// Se dentro analysisDfd.js hai: router.post('/extract-assets-dfd', ...)
// Allora l'URL finale sarà: POST /api/analyze/extract-assets-dfd ✅
app.use('/api/analyze', analysisDfdRoutes);

// ============================================================================

const PORT = 3001;
ensureUploadDirs();
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));