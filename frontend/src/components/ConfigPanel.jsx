// frontend/src/components/ConfigPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Play, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export default function ConfigPanel({ onClose }) {
    // Stato iniziale allineato al backend DEFAULT_CONFIG
    const [config, setConfig] = useState({
        ollama: {
            enabled: true,
            baseUrl: 'http://localhost:11434',
            model: 'llama3.1:8b'
        },
        project: { name: 'Default Project' },
        database: { enabled: false, type: 'sqlite', path: './data.db' },
        jsonStoragePath: './threat-models/',
        rag: {
            enabled: false,
            mode: 'http-server', // ← NUOVO: 'http-server' | 'python-client'
            baseUrl: 'http://localhost:8000',
            embeddingModel: 'nomic-embed-text',
            collectionPrefix: 'threatmodel_',
            pythonBridge: { // ← NUOVO: solo per mode='python-client'
                enabled: true,
                scriptPath: './services/rag_bridge.py',
                pythonCmd: '', // ← L'utente lo compilerà da UI
                timeout: 30000
            },
            persistDirectory: './chroma_data'
        }
    });

    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ state: 'idle', message: '' });
    const [ragStatus, setRagStatus] = useState({ state: 'idle', message: '' });
    const [dbStatus, setDbStatus] = useState({ state: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Carica config al mount
    useEffect(() => {
        loadConfig();
    }, []);

    // Fetch modelli Ollama quando cambia baseUrl o enabled
    useEffect(() => {
        if (config.ollama.enabled && config.ollama.baseUrl) {
            fetchModels();
        }
    }, [config.ollama.enabled, config.ollama.baseUrl]);

    const loadConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/config`);
            // Merge profondo per non perdere campi non presenti nella response
            setConfig(prev => {
                const merged = { ...prev, ...res.data };
                if (res.data.ollama) merged.ollama = { ...prev.ollama, ...res.data.ollama };
                if (res.data.rag) {
                    merged.rag = {
                        ...prev.rag,
                        ...res.data.rag,
                        pythonBridge: { ...prev.rag?.pythonBridge, ...res.data.rag?.pythonBridge }
                    };
                }
                if (res.data.database) merged.database = { ...prev.database, ...res.data.database };
                return merged;
            });
        } catch (err) {
            console.error('Errore caricamento config:', err);
            setRagStatus({ state: 'error', message: 'Impossibile caricare la configurazione dal server' });
        }
    };

    const fetchModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await axios.get(`${API_BASE}/ollama/models`);
            const models = Array.isArray(res.data) ? res.data : (res.data.models || []);
            setAvailableModels(models);
            // Se il modello corrente non è nella lista, seleziona il primo disponibile
            if (models.length > 0 && !models.includes(config.ollama.model)) {
                setConfig(prev => ({ ...prev, ollama: { ...prev.ollama, model: models[0] } }));
            }
        } catch (err) {
            console.warn('Impossibile recuperare i modelli Ollama:', err.message);
            setAvailableModels([]);
            setOllamaStatus({ state: 'error', message: 'Impossibile connettersi a Ollama' });
        } finally {
            setIsLoadingModels(false);
        }
    };

    const testOllama = async () => {
        if (!config.ollama.baseUrl) {
            setOllamaStatus({ state: 'error', message: 'Inserisci un URL valido per Ollama' });
            return;
        }
        setOllamaStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            // Prova a chiamare l'endpoint di test Ollama (se esiste nel backend)
            const url = new URL(config.ollama.baseUrl);
            const res = await axios.post(`${API_BASE}/test/ollama`, {
                host: url.protocol + '//' + url.hostname,
                port: url.port || (url.protocol === 'https:' ? '443' : '80')
            }, { timeout: 5000 });

            setOllamaStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
            if (res.data.connected) fetchModels();
        } catch (err) {
            // Fallback: prova a chiamare direttamente l'API di Ollama
            try {
                await axios.get(`${config.ollama.baseUrl}/api/tags`, { timeout: 3000 });
                setOllamaStatus({ state: 'connected', message: '✅ Ollama raggiungibile' });
                fetchModels();
            } catch {
                setOllamaStatus({
                    state: 'error',
                    message: '❌ Impossibile connettersi a Ollama. Verifica che sia in esecuzione.'
                });
            }
        }
    };

    const testRag = async () => {
        const rag = config.rag;

        // Validazione in base alla modalità
        if (rag.mode === 'http-server' && !rag.baseUrl) {
            setRagStatus({ state: 'error', message: 'Inserisci l\'URL di ChromaDB' });
            return;
        }
        if (rag.mode === 'python-client' && !rag.pythonBridge?.scriptPath) {
            setRagStatus({ state: 'error', message: 'Configura il percorso dello script bridge Python' });
            return;
        }

        setRagStatus({ state: 'testing', message: 'Verifica connessione...' });
        try {
            // Invia l'intera config rag per il test (il backend userà il mode corretto)
            const res = await axios.post(`${API_BASE}/rag/test-connection`, {
                rag: {
                    enabled: rag.enabled,
                    mode: rag.mode,
                    baseUrl: rag.baseUrl,
                    pythonBridge: rag.pythonBridge,
                    persistDirectory: rag.persistDirectory
                }
            }, { timeout: 15000 });

            setRagStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
        } catch (err) {
            console.error('Errore test RAG:', err);
            setRagStatus({
                state: 'error',
                message: err.response?.data?.message || err.message || 'Errore di connessione'
            });
        }
    };

    const testDB = async () => {
        setDbStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            const res = await axios.post(`${API_BASE}/test/db`, {
                type: config.database.type,
                path: config.database.path
            }, { timeout: 5000 });
            setDbStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
        } catch (err) {
            setDbStatus({ state: 'error', message: '❌ Errore di comunicazione con il backend.' });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Pulizia config prima del salvataggio (rimuovi campi null/undefined)
            const cleanConfig = JSON.parse(JSON.stringify(config, (key, value) =>
                value === null || value === undefined ? undefined : value
            ));

            await axios.put(`${API_BASE}/config`, cleanConfig);
            setRagStatus({ state: 'connected', message: '✅ Configurazione salvata!' });
            setTimeout(() => onClose(), 800);
        } catch (err) {
            console.error('Errore salvataggio config:', err);
            alert('❌ Errore nel salvataggio: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    // Helper: aggiorna campi nested in modo immutabile
    const updateField = (path, value) => {
        const keys = path.split('.');
        setConfig(prev => {
            const next = { ...prev };
            let current = next;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return next;
        });
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            idle: 'bg-gray-100 text-gray-500 border-gray-200',
            testing: 'bg-blue-50 text-blue-700 border-blue-200',
            connected: 'bg-green-50 text-green-700 border-green-200',
            error: 'bg-red-50 text-red-700 border-red-200'
        };
        const icons = {
            idle: null,
            testing: <Loader2 size={14} className="animate-spin" />,
            connected: <CheckCircle size={14} className="text-green-600" />,
            error: <AlertCircle size={14} className="text-red-600" />
        };
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${colors[status.state]}`}>
                {icons[status.state]}
                <span className="truncate max-w-[220px]">{status.message}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition"
                    aria-label="Chiudi"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-gray-800">⚙️ Configurazione Sistema</h2>

                <div className="space-y-6">
                    {/* ==================== OLLAMA ==================== */}
                    <section className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                        <label className="flex items-center gap-3 font-semibold mb-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={config.ollama.enabled}
                                onChange={e => updateField('ollama.enabled', e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-lg">🤖 LLM Locale (Ollama)</span>
                            {config.ollama.enabled && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Attivo</span>
                            )}
                        </label>

                        {config.ollama.enabled && (
                            <div className="space-y-4 pl-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Base URL</label>
                                    <input
                                        value={config.ollama.baseUrl}
                                        onChange={e => updateField('ollama.baseUrl', e.target.value)}
                                        placeholder="http://localhost:11434"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Modello</label>
                                        <button
                                            onClick={fetchModels}
                                            disabled={isLoadingModels}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {isLoadingModels ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            Aggiorna
                                        </button>
                                    </div>
                                    <select
                                        value={config.ollama.model}
                                        onChange={e => updateField('ollama.model', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        disabled={availableModels.length === 0}
                                    >
                                        {availableModels.length === 0 ? (
                                            <option value="">Nessun modello trovato</option>
                                        ) : (
                                            availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                        )}
                                    </select>
                                    {availableModels.length === 0 && config.ollama.enabled && (
                                        <p className="text-xs text-amber-600 mt-1.5">
                                            💡 Suggerimento: esegui <code className="bg-amber-100 px-1.5 py-0.5 rounded">ollama pull llama3.1:8b</code> nel terminale
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-5 pl-8">
                            <button
                                onClick={testOllama}
                                disabled={ollamaStatus.state === 'testing' || !config.ollama.enabled}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                {ollamaStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Verifica Connessione
                            </button>
                            <StatusBadge status={ollamaStatus} />
                        </div>
                    </section>

                    {/* ==================== RAG / ChromaDB ==================== */}
                    <section className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white">
                        <label className="flex items-center gap-3 font-semibold mb-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={config.rag?.enabled || false}
                                onChange={e => updateField('rag.enabled', e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="text-lg">🧠 RAG con ChromaDB</span>
                            {config.rag?.enabled && (
                                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Attivo</span>
                            )}
                        </label>

                        {config.rag?.enabled && (
                            <div className="space-y-5 pl-8">
                                {/* Selettore modalità */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalità di connessione</label>
                                    <div className="flex gap-3">
                                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${config.rag.mode === 'http-server' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 hover:border-gray-400'}`}>
                                            <input
                                                type="radio"
                                                name="rag-mode"
                                                value="http-server"
                                                checked={config.rag.mode === 'http-server'}
                                                onChange={e => updateField('rag.mode', e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="text-sm font-medium text-gray-800">🌐 Server HTTP</div>
                                            <div className="text-xs text-gray-500 mt-1">ChromaDB avviato con <code className="bg-gray-200 px-1 rounded">chroma run</code> o Docker</div>
                                        </label>
                                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${config.rag.mode === 'python-client' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-300 hover:border-gray-400'}`}>
                                            <input
                                                type="radio"
                                                name="rag-mode"
                                                value="python-client"
                                                checked={config.rag.mode === 'python-client'}
                                                onChange={e => updateField('rag.mode', e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className="text-sm font-medium text-gray-800">🐍 Client Python</div>
                                            <div className="text-xs text-gray-500 mt-1">ChromaDB persistente via script bridge (nessun server)</div>
                                        </label>
                                    </div>
                                </div>

                                {/* Campi per HTTP Server */}
                                {config.rag.mode === 'http-server' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">URL ChromaDB</label>
                                            <input
                                                value={config.rag.baseUrl || ''}
                                                onChange={e => updateField('rag.baseUrl', e.target.value)}
                                                placeholder="http://localhost:8000"
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Campi per Python Client */}
                                {config.rag.mode === 'python-client' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Percorso script bridge</label>
                                            <input
                                                value={config.rag.pythonBridge?.scriptPath || ''}
                                                onChange={e => updateField('rag.pythonBridge.scriptPath', e.target.value)}
                                                placeholder="./services/rag_bridge.py"
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            />
                                            <p className="text-xs text-gray-500 mt-1.5">Percorso relativo alla cartella <code className="bg-gray-100 px-1 rounded">backend/</code></p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Interprete Python</label>
                                            <input
                                                value={config.rag.pythonBridge?.pythonCmd || ''}
                                                onChange={e => updateField('rag.pythonBridge.pythonCmd', e.target.value)}
                                                placeholder="./.venv/Scripts/python.exe"
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            />
                                            <p className="text-xs text-gray-500 mt-1.5">Lascia vuoto per usare <code className="bg-gray-100 px-1 rounded">python3</code> di sistema</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Directory dati ChromaDB</label>
                                            <input
                                                value={config.rag.persistDirectory || ''}
                                                onChange={e => updateField('rag.persistDirectory', e.target.value)}
                                                placeholder="./chroma_data"
                                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Campi comuni */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Modello embedding</label>
                                        <input
                                            value={config.rag.embeddingModel || ''}
                                            onChange={e => updateField('rag.embeddingModel', e.target.value)}
                                            placeholder="nomic-embed-text"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Prefisso collezioni</label>
                                        <input
                                            value={config.rag.collectionPrefix || ''}
                                            onChange={e => updateField('rag.collectionPrefix', e.target.value)}
                                            placeholder="threatmodel_"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-5 pl-8">
                            <button
                                onClick={testRag}
                                disabled={ragStatus.state === 'testing' || !config.rag?.enabled}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                {ragStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Verifica Connessione
                            </button>
                            <StatusBadge status={ragStatus} />
                        </div>

                        {/* Note esplicative dinamiche */}
                        {config.rag?.enabled && (
                            <div className={`mt-4 p-4 rounded-lg text-sm ${config.rag.mode === 'http-server' ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                                {config.rag.mode === 'http-server' ? (
                                    <>
                                        <strong>🌐 Modalità Server HTTP</strong><br />
                                        Avvia ChromaDB come servizio separato:
                                        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
                                            <li><strong>Docker:</strong> <code className="bg-blue-100/70 px-1.5 py-0.5 rounded">docker run -p 8000:8000 chromadb/chroma:latest</code></li>
                                            <li><strong>Python:</strong> <code className="bg-blue-100/70 px-1.5 py-0.5 rounded">chroma run --host 0.0.0.0 --port 8000</code></li>
                                        </ul>
                                    </>
                                ) : (
                                    <>
                                        <strong>🐍 Modalità Client Python</strong><br />
                                        Nessun server da avviare. Assicurati che:
                                        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
                                            <li>Lo script <code className="bg-emerald-100/70 px-1.5 py-0.5 rounded">rag_bridge.py</code> esista in <code className="bg-emerald-100/70 px-1.5 py-0.5 rounded">backend/services/</code></li>
                                            <li>ChromaDB sia installato nel venv: <code className="bg-emerald-100/70 px-1.5 py-0.5 rounded">pip install chromadb</code></li>
                                            <li>Il percorso Python punti al venv corretto (es. <code className="bg-emerald-100/70 px-1.5 py-0.5 rounded">./.venv/Scripts/python.exe</code>)</li>
                                        </ul>
                                    </>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ==================== DATABASE ==================== */}
                    <section className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                        <label className="flex items-center gap-3 font-semibold mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.database.enabled}
                                onChange={e => updateField('database.enabled', e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-lg">🗄️ Database Locale</span>
                        </label>

                        {config.database.enabled && (
                            <div className="space-y-4 pl-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                                        <select
                                            value={config.database.type}
                                            onChange={e => updateField('database.type', e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        >
                                            <option value="sqlite">SQLite</option>
                                            <option value="postgres" disabled>PostgreSQL (prossimo step)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Percorso file</label>
                                        <input
                                            value={config.database.path}
                                            onChange={e => updateField('database.path', e.target.value)}
                                            placeholder="./data.db"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-5 pl-8">
                            <button
                                onClick={testDB}
                                disabled={dbStatus.state === 'testing' || !config.database.enabled}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition shadow-sm"
                            >
                                {dbStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Verifica
                            </button>
                            <StatusBadge status={dbStatus} />
                        </div>
                    </section>

                    {/* ==================== JSON STORAGE ==================== */}
                    <section className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                        <label className="font-semibold mb-3 block text-lg">📁 Cartella salvataggio JSON</label>
                        <input
                            value={config.jsonStoragePath}
                            onChange={e => updateField('jsonStoragePath', e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="./threat-models/"
                        />
                        <p className="text-xs text-gray-500 mt-2">I file <code className="bg-gray-100 px-1 rounded">threat-model.json</code> verranno salvati in questa directory</p>
                    </section>

                    {/* ==================== SALVA ==================== */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {isSaving ? 'Salvataggio in corso...' : 'Salva Configurazione'}
                    </button>
                </div>
            </div>
        </div>
    );
}