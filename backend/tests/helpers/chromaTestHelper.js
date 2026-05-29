const path = require('path');
const fs = require('fs').promises;
const { RagService } = require('../../services/ragService');

async function createTempChromaDir() {
    const tempDir = path.join(__dirname, '../tmp_chroma_' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
}

async function cleanupTempChromaDir(tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
}

async function createRagServiceWithTempDir(configOverrides = {}) {
    const persistDir = await createTempChromaDir();
    const config = {
        rag: {
            enabled: true,
            mode: 'python-client',
            persistDirectory: persistDir,
            pythonBridge: {
                scriptPath: './services/rag_bridge.py',
                pythonCmd: process.env.PYTHON_CMD || '.venv/Scripts/python.exe',
                timeout: 30000
            },
            ...configOverrides
        }
    };
    const ragService = new RagService(config);
    return { ragService, persistDir };
}

module.exports = { createTempChromaDir, cleanupTempChromaDir, createRagServiceWithTempDir };