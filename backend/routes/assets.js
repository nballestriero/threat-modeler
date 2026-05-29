const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const flowController = require('../controllers/flowController');

// Asset
router.get('/assets', assetController.getAllAssets);
router.post('/assets', assetController.createAsset);
router.post('/assets/import', assetController.importAssets);
router.put('/assets/:id', assetController.updateAsset);
router.delete('/assets/:id', assetController.deleteAsset);

// Flussi
router.get('/flows', flowController.getAllFlows);
router.post('/flows', flowController.createFlow);
router.put('/flows/:id', flowController.updateFlow);
router.delete('/flows/:id', flowController.deleteFlow);

module.exports = router;