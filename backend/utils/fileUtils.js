const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const VALID_TYPES = ['docs', 'csv', 'context'];

async function extractText(filePath, ext) {
    const buffer = fsSync.readFileSync(filePath);
    if (ext === '.pdf') {
        const data = await pdfParse(buffer);
        return data.text || '';
    }
    // Per file di testo (md, html, txt, tex)
    return buffer.toString('utf8')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function ensureUploadDirs() {
    VALID_TYPES.forEach(t => fsSync.mkdirSync(path.join(UPLOAD_DIR, t), { recursive: true }));
}

function getUploadDir() {
    return UPLOAD_DIR;
}

module.exports = { extractText, ensureUploadDirs, getUploadDir, VALID_TYPES };