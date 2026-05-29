// backend/services/textExtractorService.js
/**
 * @file Servizio per l'estrazione di testo da formati documentali
 * @module services/textExtractorService
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const { marked } = require('marked');
const cheerio = require('cheerio');

/**
 * Estrae testo da un file in base all'estensione
 * @async
 * @param {string} filePath - Percorso assoluto del file
 * @returns {Promise<string>} Testo estratto
 * @throws {Error} Se il formato non è supportato o la lettura fallisce
 */
async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = await fs.readFile(filePath);

    switch (ext) {
        case '.pdf':
            return await extractFromPDF(buffer);
        case '.md':
            return await extractFromMarkdown(buffer);
        case '.txt':
            return buffer.toString('utf-8');
        case '.html':
        case '.htm':
            return await extractFromHTML(buffer);
        default:
            throw new Error(`Formato non supportato: ${ext}`);
    }
}

/**
 * Estrae testo da un PDF
 * @async
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromPDF(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
}

/**
 * Estrae testo da Markdown (converte in HTML e poi estrae il testo)
 * @async
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromMarkdown(buffer) {
    const markdown = buffer.toString('utf-8');
    // marked.parse restituisce Promise se si usa async/await
    const html = await marked.parse(markdown);
    return stripHtml(html);
}

/**
 * Estrae testo da HTML
 * @async
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromHTML(buffer) {
    const html = buffer.toString('utf-8');
    return stripHtml(html);
}

/**
 * Rimuove i tag HTML e normalizza spazi
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
    const $ = cheerio.load(html);
    // Prende tutto il testo, rimuove spazi multipli e trim
    return $('body').text().replace(/\s+/g, ' ').trim();
}

module.exports = { extractTextFromFile };