/**
 * @file Utility per la gestione della configurazione
 * @module utils/configUtils
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.json');
const CONFIG_BACKUP = CONFIG_FILE + '.bak';

const DEFAULT_CONFIG = {
    ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' },
    project: { name: 'Nuovo Progetto' },
    database: { enabled: false, type: 'sqlite', path: './data.db' },
    jsonStoragePath: './threat-models/',
    rag: {
        enabled: false,
        mode: 'http-server',
        baseUrl: 'http://localhost:8000',
        embeddingModel: 'nomic-embed-text',
        collectionPrefix: 'threatmodel_',
        pythonBridge: {
            enabled: true,
            scriptPath: './services/rag_bridge.py',
            pythonCmd: 'python3',
            timeout: 30000
        },
        persistDirectory: './chroma_data'
    }
};

function validateConfig(config) {
    const errors = [];
    if (config.ollama?.enabled) {
        if (!config.ollama.baseUrl?.startsWith('http')) errors.push('ollama.baseUrl deve essere un URL HTTP valido');
        if (!config.ollama.model) errors.push('ollama.model è obbligatorio se Ollama è abilitato');
    }
    if (config.rag?.enabled) {
        const mode = config.rag.mode || 'http-server';
        if (!['http-server', 'python-client'].includes(mode)) errors.push(`rag.mode deve essere 'http-server' o 'python-client', ricevuto: ${mode}`);
        if (mode === 'http-server' && !config.rag.baseUrl) errors.push('rag.baseUrl è obbligatorio per mode=http-server');
        if (mode === 'python-client' && !config.rag.pythonBridge?.scriptPath) errors.push('rag.pythonBridge.scriptPath è obbligatorio per mode=python-client');
    }
    if (errors.length > 0) throw new Error('Configurazione non valida: ' + errors.join('; '));
    return true;
}

function deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target && target[key] instanceof Object) {
            output[key] = deepMerge(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

let _cachedConfig = null;
let _lastMtime = null;

async function loadConfig({ force = false } = {}) {
    try {
        const stats = await fs.stat(CONFIG_FILE).catch(() => null);
        if (!force && _cachedConfig && stats && stats.mtimeMs === _lastMtime) return _cachedConfig;
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        const merged = deepMerge(DEFAULT_CONFIG, parsed);
        _cachedConfig = merged;
        _lastMtime = stats?.mtimeMs;
        return merged;
    } catch (err) {
        console.warn('⚠️ config.json non letto, uso default:', err.message);
        await saveConfigInternal(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
}

async function saveConfigInternal(config) {
    if (fsSync.existsSync(CONFIG_FILE)) await fs.copyFile(CONFIG_FILE, CONFIG_BACKUP).catch(() => { });
    const tmpFile = CONFIG_FILE + '.tmp';
    await fs.writeFile(tmpFile, JSON.stringify(config, null, 2), 'utf-8');
    await fs.rename(tmpFile, CONFIG_FILE);
    _cachedConfig = null;
    _lastMtime = null;
}

async function saveConfig(config) {
    validateConfig(config);
    await saveConfigInternal(config);
}

function resetConfigCache() { _cachedConfig = null; _lastMtime = null; }

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG, CONFIG_FILE, validateConfig, deepMerge, resetConfigCache };