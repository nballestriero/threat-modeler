const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.json');
const DEFAULT_CONFIG = {
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
        enabled: true
    },
    project: { name: 'Nuovo Progetto' },
    rag: {
        enabled: false,
        baseUrl: 'http://localhost:8000',
        collectionPrefix: 'threatmodel_',
        embeddingModel: 'nomic-embed-text'
    }
};

async function loadConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return DEFAULT_CONFIG;
    }
}

async function saveConfig(config) {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG, CONFIG_FILE };