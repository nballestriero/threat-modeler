/**
 * @file Servizio per la gestione delle metodologie di threat modeling
 * @module services/methodologyService
 * 
 * @description
 * Gestisce il caricamento e la validazione delle metodologie definite in 
 * `backend/methodologies/`. Ogni metodologia ha:
 * - `manifest.json`: metadati (nome, descrizione, versione)
 * - `taxonomy.json`: tassonomia asset/categorie con stili per DFD
 * - `prompts/*.md`: template prompt per LLM
 * 
 * @see {@link ../methodologies/manifest.json} Manifesto metodologie
 */

const fs = require('fs').promises;
const path = require('path');

const cache = {
    manifest: null,
    methodologies: new Map(),
    taxonomies: new Map()
};

/**
 * Carica il manifesto delle metodologie da filesystem.
 * @async
 * @returns {Promise<Object>} Oggetto manifest con lista metodologie
 */
async function loadManifest() {
    if (cache.manifest) return cache.manifest;

    const manifestPath = path.join(__dirname, '../methodologies/manifest.json');
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        cache.manifest = JSON.parse(raw);
        return cache.manifest;
    } catch (err) {
        console.error('❌ [methodologyService] Errore caricamento manifest:', err.message);
        // Fallback sicuro: manifest vuoto
        return { version: '1.0', methods: [] };
    }
}

/**
 * Recupera i metadati di una metodologia specifica.
 * @async
 * @param {string} methodId - ID della metodologia (es. 'dfd-base')
 * @returns {Promise<Object>} Metadati della metodologia
 * @throws {Error} Se la metodologia non esiste nel manifest
 */
async function getMethodology(methodId) {
    if (cache.methodologies.has(methodId)) {
        return cache.methodologies.get(methodId);
    }

    const manifest = await loadManifest();
    // ✅ Safety check: manifest.methods potrebbe essere undefined
    const methods = manifest.methods || [];
    const method = methods.find(m => m.id === methodId);

    if (!method) {
        throw new Error(`Metodologia non trovata: ${methodId}`);
    }

    cache.methodologies.set(methodId, method);
    return method;
}

/**
 * Carica la tassonomia di una metodologia.
 * @async
 * @param {string} methodId - ID della metodologia
 * @returns {Promise<Object>} Tassonomia con categorie e stili
 * @throws {Error} Se il file taxonomy.json non esiste o è invalido
 */
async function loadTaxonomy(methodId) {
    if (cache.taxonomies.has(methodId)) {
        return cache.taxonomies.get(methodId);
    }

    const method = await getMethodology(methodId);
    const taxonomyPath = path.join(__dirname, `../methodologies/${methodId}/taxonomy.json`);

    try {
        const raw = await fs.readFile(taxonomyPath, 'utf-8');
        const taxonomy = JSON.parse(raw);
        cache.taxonomies.set(methodId, taxonomy);
        return taxonomy;
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`Tassonomia mancante per metodologia ${methodId}: ${taxonomyPath}`);
        }
        throw new Error(`Errore caricamento tassonomia ${methodId}: ${err.message}`);
    }
}

/**
 * Costruisce il prompt di estrazione asset per una metodologia.
 * @async
 * @param {string} methodId - ID della metodologia
 * @param {string} content - Testo del documento da analizzare
 * @param {Array<Object>} [ragContext] - Contesto RAG opzionale
 * @returns {Promise<string>} Prompt completo per LLM
 */
async function buildExtractionPrompt(methodId, content, ragContext = []) {
    const method = await getMethodology(methodId);
    const taxonomy = await loadTaxonomy(methodId);

    const promptPath = path.join(__dirname, `../methodologies/${methodId}/prompts/extraction.md`);
    let template = await fs.readFile(promptPath, 'utf-8');

    template = template
        .replace('{{CATEGORIES}}', (taxonomy.categories || []).map(c => c.name).join(', '))
        .replace('{{CONTENT}}', content.slice(0, 4000))
        .replace('{{RAG_CONTEXT}}', (ragContext || []).map(c => c.content).join('\n---\n'));

    return template;
}

/**
 * Verifica se una metodologia supporta l'estrazione RAG.
 * @param {string} methodId - ID della metodologia
 * @returns {Promise<boolean>} True se RAG è abilitato per la metodologia
 */
async function supportsRag(methodId) {
    const method = await getMethodology(methodId);
    return method.rag?.enabled ?? false;
}

// ✅ Unico module.exports finale
module.exports = {
    loadManifest,
    getMethodology,
    loadTaxonomy,
    buildExtractionPrompt,
    supportsRag,
    __resetCache: () => {
        cache.manifest = null;
        cache.methodologies.clear();
        cache.taxonomies.clear();
    }
};