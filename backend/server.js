/**
 * @file Entry point del backend Express per threat-modeler
 * @module server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fsSync = require('fs');
const { ensureUploadDirs } = require('./utils/fileUtils');
const { loadConfig } = require('./utils/configUtils');
const { errorMiddleware } = require('./utils/errorHandler');
const projectScope = require('./middleware/projectScope'); // ✅ NUOVO: Risolve req.projectDir

const app = express();

// Middleware core
app.use(cors());
app.use(express.json());
app.use(projectScope); // ✅ Inietta req.projectDir prima di ogni route

// Route modules
const assetsRoutes = require('./routes/assets');
const configRoutes = require('./routes/config');
const filesRoutes = require('./routes/files');
const taxonomyRoutes = require('./routes/taxonomy');
const analysisRoutes = require('./routes/analysis');
const dfdRoutes = require('./routes/dfd');
const ragRoutes = require('./routes/rag');
const ollamaRoutes = require('./routes/ollama');
const projectsRoutes = require('./routes/projects'); // ✅ NUOVO

const methodologies = require('./methodologies');

// Registra metodologie
for (const [name, module] of Object.entries(methodologies)) {
    if (module.router) {
        app.use(`/api/methodologies/${name}`, module.router);
        console.log(`✅ Metodologia ${name} montata su /api/methodologies/${name}`);
    }
}

// Endpoint metodologie
app.get('/api/methodologies', (req, res) => {
    res.json(Object.keys(methodologies));
});

// Rotte API
app.use(require('./middleware/projectScope'));
app.use('/api/config', require('./routes/config'));
app.use('/api/projects', projectsRoutes); // ✅ NUOVO
app.use('/api', assetsRoutes);
app.use('/api', configRoutes);
app.use('/api', filesRoutes);
app.use('/api', taxonomyRoutes);
app.use('/api', dfdRoutes);
app.use('/api', ragRoutes);
app.use('/api', ollamaRoutes);
app.use('/api/analyze', analysisRoutes);

// ============================================================================
// MIDDLEWARE GLOBALE DI ERRORE (deve essere l'ultimo)
// ============================================================================
app.use(errorMiddleware);

// ============================================================================
// Caricamento configurazione e inizializzazione RAG (solo se non in test)
// ============================================================================
(async () => {
    try {
        const config = await loadConfig();
        app.locals.config = config;
        console.log('✅ Configurazione caricata e disponibile in app.locals');

        if (process.env.NODE_ENV !== 'test' && config.rag?.enabled) {
            const { RagService } = require('./services/ragService');
            const methodologyService = require('./services/methodologyService');
            const ragService = new RagService(config);
            try {
                const manifest = await methodologyService.loadManifest();
                for (const method of manifest.methodologies) {
                    if (!method.enabled) continue;
                    const collectionName = `methodology_${method.id}`;
                    try {
                        let taxonomy;
                        try {
                            taxonomy = await methodologyService.loadTaxonomy(method.id);
                        } catch (taxErr) {
                            console.warn(`⚠️ [INIT] Tassonomia mancante per metodologia ${method.id} (${taxErr.message}), salto indicizzazione.`);
                            continue;
                        }
                        const result = await ragService.query(collectionName, 'test', null, 1);
                        if (result.count === 0) {
                            console.log(`📚 [INIT] Indicizzo tassonomia per metodologia ${method.id} (${taxonomy.categories?.length || 0} categorie)...`);
                            const documents = taxonomy.categories.map(cat => ({
                                id: `taxonomy_${cat.name}`,
                                text: `Categoria: ${cat.name}. Descrizione: ${cat.description}. Forma: ${cat.shape}. Colore: ${cat.color}.`,
                                metadata: { type: 'taxonomy', category: cat.name, methodology: method.id }
                            }));
                            await ragService.ingest(collectionName, documents);
                            console.log(`✅ [INIT] Indicizzati ${documents.length} documenti (categorie) per ${collectionName}.`);
                        } else {
                            console.log(`📚 [INIT] Collezione ${collectionName} già popolata.`);
                        }
                    } catch (err) {
                        console.warn(`⚠️ [INIT] Errore per ${collectionName}:`, err.message);
                    }
                }
            } catch (err) {
                console.warn('⚠️ [INIT] Impossibile inizializzare metodologie RAG:', err.message);
            }
        }
    } catch (err) {
        console.error('❌ Impossibile caricare configurazione:', err);
        process.exit(1);
    }
})();

const PORT = process.env.PORT || 3001;
if (require.main === module) {
    ensureUploadDirs();
    app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));
}

module.exports = app;