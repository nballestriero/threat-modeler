const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const TAXONOMY_PATH = path.join(__dirname, '../context/taxonomy.json');

router.get('/taxonomy', async (req, res) => {
    try {
        const data = await fs.readFile(TAXONOMY_PATH, 'utf-8');
        const taxonomy = JSON.parse(data);
        res.json(taxonomy);
    } catch (err) {
        res.status(500).json({ error: 'Tassonomia non disponibile' });
    }
});

module.exports = router;