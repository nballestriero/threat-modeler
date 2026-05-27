// backend/server.js
const express = require('express');
const cors = require('cors');
const { ensureUploadDirs } = require('./utils/fileUtils');

const app = express();
app.use(cors());
app.use(express.json());

// Importa tutte le route
const assetsRoutes = require('./routes/assets');
const configRoutes = require('./routes/config');
const filesRoutes = require('./routes/files');
const taxonomyRoutes = require('./routes/taxonomy');
const analysisRoutes = require('./routes/analysis');      // contiene anche /rag-test
const analysisDfdRoutes = require('./routes/analysisDfd');
const dfdRoutes = require('./routes/dfd');
const testRoutes = require('./routes/test');
const ragRoutes = require('./routes/rag');



// Registra le route

app.use('/api', assetsRoutes);
app.use('/api', configRoutes);
app.use('/api', filesRoutes);
app.use('/api', taxonomyRoutes);
app.use('/api', analysisRoutes);
app.use('/api', analysisDfdRoutes);
app.use('/api', dfdRoutes);
app.use('/api', testRoutes);
//app.use('/api', ragRoutes);
app.use('/api/rag', ragRoutes)


// Log di avvio per ogni modulo (facoltativo)
console.log('✅ Route registrate:');
console.log('   - /api/assets          (CRUD asset)');
console.log('   - /api/config          (configurazione)');
console.log('   - /api/files/*         (gestione file)');
console.log('   - /api/taxonomy        (tassonomia completa)');
console.log('   - /api/analyze/extract-assets      (analisi completa STRIDE-AI)');
console.log('   - /api/analyze/extract-assets-dfd  (analisi DFD base)');
console.log('   - /api/rag-test        (test connessione ChromaDB)');
console.log('   - /api/dfd             (generazione DFD)');
console.log('   - /api/test/*          (test Ollama, DB)');

const PORT = 3001;
ensureUploadDirs();
app.listen(PORT, () => console.log(`✅ Backend modulare attivo su http://localhost:${PORT}`));