const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const JSON_FILE = path.join(__dirname, '../threat-model.json');
const DEFAULT_CONFIG = {
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3', enabled: true },
    project: { name: 'Nuovo Progetto' }
};

async function loadModel() {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf-8');
        const model = JSON.parse(data);
        if (!model.flows) model.flows = [];
        return model;
    } catch {
        const init = {
            project: { name: 'Nuovo Progetto', version: '1.0', owner: '' },
            config: DEFAULT_CONFIG,
            assets: [],
            flows: []
        };
        await fs.writeFile(JSON_FILE, JSON.stringify(init, null, 2));
        return init;
    }
}

async function saveModel(model) {
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
}

module.exports = { loadModel, saveModel };