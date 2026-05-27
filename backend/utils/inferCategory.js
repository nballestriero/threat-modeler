function inferCategoryFromName(name) {
    const lower = name.toLowerCase();
    if (lower.includes('model') || lower.includes('algoritmo') || lower.includes('rete neurale') || lower.includes('llm') || lower.includes('transformer')) return 'Models';
    if (lower.includes('database') || lower.includes('data') || lower.includes('dataset') || lower.includes('archivio') || lower.includes('rag') || lower.includes('corpus')) return 'Data';
    if (lower.includes('server') || lower.includes('api') || lower.includes('endpoint') || lower.includes('storage') || lower.includes('cloud') || lower.includes('chroma') || lower.includes('vector')) return 'Infrastructure';
    if (lower.includes('user') || lower.includes('attore') || lower.includes('admin') || lower.includes('sviluppatore') || lower.includes('doctor') || lower.includes('patient')) return 'Actors';
    if (lower.includes('processo') || lower.includes('workflow') || lower.includes('pipeline') || lower.includes('training') || lower.includes('retraining') || lower.includes('loop') || lower.includes('adaptation')) return 'Processes';
    if (lower.includes('tool') || lower.includes('framework') || lower.includes('libreria')) return 'Tools';
    if (lower.includes('documento') || lower.includes('schema') || lower.includes('architettura') || lower.includes('prompt') || lower.includes('version')) return 'Artefacts';
    return 'Data';
}

module.exports = { inferCategoryFromName };