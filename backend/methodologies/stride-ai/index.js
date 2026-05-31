/**
 * @file Metodologia STRIDE-AI (WIP - disabilitata)
 * @module methodologies/stride-ai
 * 
 * @description
 * Placeholder per metodologia STRIDE potenziata con AI.
 * Attualmente disabilitata nel manifest per evitare errori di import.
 */

const METHOD_NAME = 'stride-ai';
const METHOD_VERSION = '0.1.0-wip';

// ✅ Non importare routes/advancedAssets (file inesistente)
// const { loadAdvanced, saveAdvanced } = require('../../routes/advancedAssets');

/**
 * Carica la tassonomia per STRIDE-AI.
 * @returns {Promise<never>} Lancia sempre errore (metodologia non pronta)
 */
async function loadTaxonomy() {
    throw new Error('Metodologia STRIDE-AI non ancora implementata');
}

/**
 * Costruisce il prompt di estrazione per STRIDE-AI.
 * @returns {Promise<never>} Lancia sempre errore
 */
async function buildExtractionPrompt() {
    throw new Error('Metodologia STRIDE-AI non ancora implementata');
}

module.exports = {
    METHOD_NAME,
    METHOD_VERSION,
    loadTaxonomy,
    buildExtractionPrompt
};