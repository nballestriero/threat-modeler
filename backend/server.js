const express = require('express');
const cors = require('cors');
const { ensureUploadDirs } = require('./utils/fileUtils');

const app = express();
app.use(cors());
app.use(express.json());

// Route
const assetsRoutes = require('./routes/assets');
const configRoutes = require('./routes/config');
const filesRoutes = require('./routes/files');
const taxonomyRoutes = require('./routes/taxonomy');
const analysisRoutes = require('./routes/analysis');
const analysisDfdRoutes = require('./routes/analysisDfd');
const dfdRoutes = require('./routes/dfd');
const testRoutes = require('./routes/test');
const { router: advancedRouter } = require('./routes/advancedAssets');
const enrichmentRoutes = require('./routes/enrichment');

app.use('/api', assetsRoutes);
app.use('/api', configRoutes);
app.use('/api', filesRoutes);
app.use('/api', taxonomyRoutes);
app.use('/api', analysisRoutes);
app.use('/api', analysisDfdRoutes);
app.use('/api', dfdRoutes);
app.use('/api', testRoutes);
app.use('/api', advancedRouter);
app.use('/api', enrichmentRoutes);

const PORT = 3001;
ensureUploadDirs();
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));