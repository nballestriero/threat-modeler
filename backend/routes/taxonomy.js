const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');
const DFD_TAXONOMY_PATH = path.join(__dirname, '../context/dfd-taxonomy.json');

router.get('/taxonomy', async (req, res) => {
    try {
        const data = await fs.readFile(TAXONOMY_PATH, 'utf-8');
        const taxonomy = JSON.parse(data);
        res.json(taxonomy);
    } catch (err) {
        res.status(500).json({ error: 'Tassonomia non disponibile' });
    }
});

router.get('/dfd-taxonomy', async (req, res) => {
    try {
        const data = await fs.readFile(DFD_TAXONOMY_PATH, 'utf-8');
        const taxonomy = JSON.parse(data);
        res.json(taxonomy);
    } catch (err) {
        console.error('Errore caricamento dfd-taxonomy.json:', err);
        // Fallback con colori di default
        res.json({
            categories: [
                { name: 'External Entity', color: '#1E40AF', colorBg: '#DBEAFE' },
                { name: 'Process', color: '#B45309', colorBg: '#FEF3C7' },
                { name: 'Data Store', color: '#047857', colorBg: '#D1FAE5' }
            ]
        });
    }
});

module.exports = router;