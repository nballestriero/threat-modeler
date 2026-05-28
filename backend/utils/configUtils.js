// backend/utils/configUtils.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.json');
const CONFIG_BACKUP = CONFIG_FILE + '.bak';

// Schema di default con supporto per rag.mode
const DEFAULT_CONFIG = {
    ollama: {
        enabled: true,
        baseUrl: 'http://localhost:11434',
        model: 'llama3.1:8b'
    },
    project: { name: 'Nuovo Progetto' },
    database: {
        enabled: false,
        type: 'sqlite',
        path: './data.db'
    },
    jsonStoragePath: './threat-models/',
    rag: {
        enabled: false,
        mode: 'http-server', // ✅ NUOVO: 'http-server' | 'python-client'
        baseUrl: 'http://localhost:8000',
        embeddingModel: 'nomic-embed-text',
        collectionPrefix: 'threatmodel_',
        pythonBridge: { // ✅ NUOVO: solo per mode='python-client'
            enabled: true,
            scriptPath: './services/rag_bridge.py',
            pythonCmd: 'python3',
            timeout: 30000
        },
        persistDirectory: './chroma_data' // ✅ NUOVO: per Python client
    }
};

// Validazione minimale della configurazione
function validateConfig(config) {
    const errors = [];

    // Ollama
    if (config.ollama?.enabled) {
        if (!config.ollama.baseUrl?.startsWith('http')) {
            errors.push('ollama.baseUrl deve essere un URL HTTP valido');
        }
        if (!config.ollama.model) {
            errors.push('ollama.model è obbligatorio se Ollama è abilitato');
        }
    }

    // RAG
    if (config.rag?.enabled) {
        const mode = config.rag.mode || 'http-server';
        if (!['http-server', 'python-client'].includes(mode)) {
            errors.push(`rag.mode deve essere 'http-server' o 'python-client', ricevuto: ${mode}`);
        }
        if (mode === 'http-server' && !config.rag.baseUrl) {
            errors.push('rag.baseUrl è obbligatorio per mode=http-server');
        }
        if (mode === 'python-client') {
            if (!config.rag.pythonBridge?.scriptPath) {
                errors.push('rag.pythonBridge.scriptPath è obbligatorio per mode=python-client');
            }
            // Normalizza path relativo
            if (config.rag.pythonBridge.scriptPath && !path.isAbsolute(config.rag.pythonBridge.scriptPath)) {
                config.rag.pythonBridge.scriptPath = path.join(__dirname, config.rag.pythonBridge.scriptPath);
            }
        }
    }

    if (errors.length > 0) {
        throw new Error('Configurazione non valida: ' + errors.join('; '));
    }
    return true;
}

// Deep merge per aggiornamenti parziali
function deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
        if (
            source[key] instanceof Object &&
            !Array.isArray(source[key]) &&
            key in target &&
            target[key] instanceof Object
        ) {
            output[key] = deepMerge(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

// Cache in-memory (evita letture disco ripetute)
let _cachedConfig = null;
let _lastMtime = null;

async function loadConfig({ force = false } = {}) {
    try {
        const stats = await fs.stat(CONFIG_FILE).catch(() => null);

        // Usa cache se il file non è cambiato e non è forzato il reload
        if (!force && _cachedConfig && stats && stats.mtimeMs === _lastMtime) {
            return _cachedConfig;
        }

        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(data);

        // Merge con default per campi mancanti (backward compatibility)
        const merged = deepMerge(DEFAULT_CONFIG, parsed);

        // Aggiorna cache
        _cachedConfig = merged;
        _lastMtime = stats?.mtimeMs;

        return merged;
    } catch (err) {
        console.warn('⚠️ config.json non letto, uso default:', err.message);
        // Crea file default se non esiste
        await saveConfigInternal(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
}

// Scrittura atomica con backup
async function saveConfigInternal(config) {
    // Backup del file esistente
    if (fsSync.existsSync(CONFIG_FILE)) {
        try {
            await fs.copyFile(CONFIG_FILE, CONFIG_BACKUP);
        } catch (e) {
            console.warn('⚠️ Backup fallito, procedo:', e.message);
        }
    }

    // Scrittura atomica: tmp → rename
    const tmpFile = CONFIG_FILE + '.tmp';
    await fs.writeFile(tmpFile, JSON.stringify(config, null, 2), 'utf-8');
    await fs.rename(tmpFile, CONFIG_FILE);

    // Invalida cache
    _cachedConfig = null;
    _lastMtime = null;
}

async function saveConfig(config) {
    // Validazione prima di salvare
    validateConfig(config);
    await saveConfigInternal(config);
}

// Utility per test: resetta la cache (utile nei test)
function resetConfigCache() {
    _cachedConfig = null;
    _lastMtime = null;
}

module.exports = {
    loadConfig,
    saveConfig,
    DEFAULT_CONFIG,
    CONFIG_FILE,
    validateConfig,
    deepMerge,
    resetConfigCache // per test
};