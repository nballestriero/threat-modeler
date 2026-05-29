const fs = require('fs').promises;
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../methodologies/manifest.json');
let manifestCache = null;
let taxonomiesCache = new Map();
let promptsCache = new Map();

async function loadManifest() {
    if (manifestCache) return manifestCache;
    const data = await fs.readFile(MANIFEST_PATH, 'utf-8');
    manifestCache = JSON.parse(data);
    return manifestCache;
}

async function getMethodology(methodologyId) {
    const manifest = await loadManifest();
    const methodology = manifest.methodologies.find(m => m.id === methodologyId && m.enabled === true);
    if (!methodology) throw new Error(`Metodologia ${methodologyId} non trovata o disabilitata`);
    return methodology;
}

async function loadTaxonomy(methodologyId) {
    if (taxonomiesCache.has(methodologyId)) return taxonomiesCache.get(methodologyId);
    const methodology = await getMethodology(methodologyId);
    const taxonomyPath = path.join(__dirname, '../methodologies', methodology.path, methodology.taxonomyFile);
    const data = await fs.readFile(taxonomyPath, 'utf-8');
    const taxonomy = JSON.parse(data);
    taxonomiesCache.set(methodologyId, taxonomy);
    return taxonomy;
}

async function loadPromptTemplate(methodologyId) {
    if (promptsCache.has(methodologyId)) return promptsCache.get(methodologyId);
    const methodology = await getMethodology(methodologyId);
    const promptPath = path.join(__dirname, '../methodologies', methodology.path, methodology.promptFile);
    const template = await fs.readFile(promptPath, 'utf-8');
    promptsCache.set(methodologyId, template);
    return template;
}

function renderPrompt(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, value);
    }
    // Rimuove blocchi condizionali non soddisfatti ({{#if ragContext}}...{{/if}})
    result = result.replace(/{{#if ragContext}}([\s\S]*?){{\/if}}/g, (match, content) => {
        return variables.ragContext ? content : '';
    });
    return result;
}

async function buildExtractionPrompt(methodologyId, chunkContent, ragContext = '', existingAssets = [], existingFlows = []) {
    const taxonomy = await loadTaxonomy(methodologyId);
    const categories = taxonomy.categories.map(c => c.name).join(', ');
    const template = await loadPromptTemplate(methodologyId);
    const variables = {
        categories,
        chunkContent: chunkContent.substring(0, 2500),
        ragContext: ragContext || ''
    };
    return renderPrompt(template, variables);
}

module.exports = {
    loadManifest,
    getMethodology,
    loadTaxonomy,
    loadPromptTemplate,
    buildExtractionPrompt
};

// Solo per test: resetta le cache
function __resetCache() {
    manifestCache = null;
    taxonomiesCache.clear();
    promptsCache.clear();
}

module.exports = {
    loadManifest,
    getMethodology,
    loadTaxonomy,
    loadPromptTemplate,
    buildExtractionPrompt,
    __resetCache  // esportato solo per test
};