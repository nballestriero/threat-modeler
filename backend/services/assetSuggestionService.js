// backend/services/assetSuggestionService.js
/**
 * Servizio per generare suggerimenti di miglioramento per un asset usando Ollama
 * @module services/assetSuggestionService
 */

const { loadModel } = require('../models/assetModel');
const { callOllama } = require('./ollamaService');
const methodologyService = require('./methodologyService');

/**
 * Genera suggerimenti per migliorare un asset basandosi sul contesto e sulla tassonomia.
 * @param {string} assetId - ID dell'asset
 * @param {Object} config - Configurazione dell'app (per Ollama)
 * @returns {Promise<{name: string, category: string, description: string}>}
 */
async function suggestAssetImprovements(assetId, config) {
    const model = await loadModel();
    const asset = model.assets.find(a => a.id === assetId);
    if (!asset) throw new Error('Asset non trovato');

    let chunksText = 'Nessun contesto disponibile.';
    if (asset.evidence && asset.evidence.chunks && asset.evidence.chunks.length > 0) {
        chunksText = asset.evidence.chunks.map(c => c.snippet || 'Contesto non disponibile').join('\n---\n');
    }

    const taxonomy = await methodologyService.loadTaxonomy('dfd-base');
    const categories = taxonomy.categories.map(c => c.name).join(', ');

    const prompt = `
Sei un esperto di threat modeling. Migliora l'asset seguente basandoti sul contesto fornito.

Asset corrente:
- Nome: ${asset.name}
- Categoria: ${asset.category}
- Descrizione: ${asset.description || 'nessuna'}

Contesto (documentazione):
${chunksText}

Categorie valide (usa solo queste): ${categories}

Rispondi SOLO con un JSON valido nel formato:
{
  "name": "nome migliorato",
  "category": "categoria migliore",
  "description": "descrizione migliorata e più dettagliata"
}
`;
    const response = await callOllama(prompt, config, {
        systemPrompt: 'Sei un assistente tecnico. Rispondi solo con JSON valido.',
        temperature: 0.3,
        numPredict: 500
    });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Nessun JSON valido');
    return JSON.parse(jsonMatch[0]);
}

module.exports = { suggestAssetImprovements };