/**
 * @file Route per le operazioni di analisi (estrazione asset)
 * @module routes/analysis
 */

const express = require('express');
const router = express.Router();
const { extractAssets } = require('../controllers/assetExtractionController');

router.post('/extract-assets', extractAssets);

module.exports = router;