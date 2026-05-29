/**
 * @file Servizio per il merging di asset per similarità (trigrammi)
 * @module services/assetMergeService
 */

/**
 * Genera i trigrammi di una stringa
 * @param {string} str - Stringa da processare
 * @returns {Set<string>} Set di trigrammi
 */
function getTrigrams(str) {
    const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    const trigrams = new Set();
    for (const word of words) {
        if (word.length >= 3) {
            for (let i = 0; i <= word.length - 3; i++) {
                trigrams.add(word.slice(i, i + 3));
            }
        } else {
            trigrams.add(word);
        }
    }
    return trigrams;
}

/**
 * Calcola la similarità tra due stringhe (coefficiente di Jaccard sui trigrammi)
 * @param {string} a - Prima stringa
 * @param {string} b - Seconda stringa
 * @returns {number} Valore tra 0 e 1
 */
function calculateStringSimilarity(a, b) {
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;
    const trigramsA = getTrigrams(a);
    const trigramsB = getTrigrams(b);
    if (trigramsA.size === 0 && trigramsB.size === 0) return 1.0;
    const intersection = new Set([...trigramsA].filter(x => trigramsB.has(x)));
    const union = new Set([...trigramsA, ...trigramsB]);
    return intersection.size / union.size;
}

/**
 * Unisce asset per similarità dei nomi (soglia > 0.8) e aggrega i chunk di provenienza.
 * @param {Array<Object>} assetsFromAllChunks - Array di asset con campi: name, category, description, chunkIndex
 * @returns {Array<Object>} Asset unici con campo evidence.chunks
 */
function mergeAssetsBySimilarity(assetsFromAllChunks) {
    if (!assetsFromAllChunks.length) return [];

    // Raggruppa per nome normalizzato (case‑insensitive)
    const groups = new Map();
    for (const asset of assetsFromAllChunks) {
        const key = asset.name.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(asset);
    }

    const merged = [];
    const processed = new Set();
    const keys = Array.from(groups.keys());

    for (let i = 0; i < keys.length; i++) {
        if (processed.has(keys[i])) continue;
        const similarKeys = [keys[i]];
        for (let j = i + 1; j < keys.length; j++) {
            if (processed.has(keys[j])) continue;
            if (calculateStringSimilarity(keys[i], keys[j]) > 0.8) {
                similarKeys.push(keys[j]);
                processed.add(keys[j]);
            }
        }
        processed.add(keys[i]);

        const mergedAssets = [];
        for (const k of similarKeys) {
            mergedAssets.push(...(groups.get(k) || []));
        }

        const first = mergedAssets[0];
        // Descrizione più lunga
        let bestDescription = first.description;
        for (const a of mergedAssets) {
            if (a.description?.length > bestDescription?.length) bestDescription = a.description;
        }
        // Categoria più frequente (voto di maggioranza)
        const categoryCounts = new Map();
        for (const a of mergedAssets) {
            categoryCounts.set(a.category, (categoryCounts.get(a.category) || 0) + 1);
        }
        let bestCategory = first.category;
        let maxCount = 0;
        for (const [cat, cnt] of categoryCounts) {
            if (cnt > maxCount) { maxCount = cnt; bestCategory = cat; }
        }
        // Chunk unici (senza duplicati)
        const uniqueChunks = [...new Set(mergedAssets.map(a => a.chunkIndex).filter(i => i !== undefined))];

        merged.push({
            name: first.name,
            category: bestCategory,
            description: bestDescription || '',
            source: 'llm-extraction',
            evidence: { chunks: uniqueChunks.map(idx => ({ index: idx })) }
        });
    }
    return merged;
}

module.exports = { mergeAssetsBySimilarity };