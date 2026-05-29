/**
 * @file Servizio per la suddivisione di testi in chunk con overlap
 * @module services/chunkService
 */

/**
 * Suddivide un testo in chunk di dimensione massima, con overlap.
 * @param {string} text - Testo da suddividere
 * @param {number} [maxChars=1500] - Dimensione massima di ogni chunk in caratteri
 * @param {number} [overlapChars=150] - Numero di caratteri di overlap tra chunk consecutivi
 * @returns {Array<{index: number, startChar: number, endChar: number, content: string}>}
 */
function splitTextIntoChunks(text, maxChars = 1500, overlapChars = 150) {
    if (!text || typeof text !== 'string') return [];
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
        let end = start + maxChars;
        if (end > text.length) end = text.length;

        // Cerca un punto di taglio pulito (spazio) se non siamo alla fine
        if (end < text.length) {
            while (end > start && !/\s/.test(text[end])) end--;
            if (end === start) end = start + maxChars; // fallback
        }

        const content = text.substring(start, end).trim();
        if (content) {
            chunks.push({
                index: chunkIndex++,
                startChar: start,
                endChar: end,
                content: content
            });
        }

        // Avanza: inizia dopo la fine meno overlap
        let nextStart = end - overlapChars;
        if (nextStart <= start) nextStart = end; // evita loop infinito
        start = nextStart;
        if (start >= text.length) break;
    }
    return chunks;
}

module.exports = { splitTextIntoChunks };