import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Play, CheckCircle, AlertCircle, Loader2, RefreshCw, Database, Cpu } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';


export default function ConfigPanel({ onClose }) {
    const [config, setConfig] = useState({
        ollama: {
            enabled: false,
            baseUrl: 'http://localhost:11434',
            model: 'llama3'
        },
        rag: {
            enabled: false,
            baseUrl: 'http://localhost:8000',
            embeddingModel: 'nomic-embed-text'
        },
        database: { enabled: false, type: 'sqlite', path: './data.db' },
        jsonStoragePath: './threat-models/'
    });

    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ state: 'idle', message: '' });
    const [ragStatus, setRagStatus] = useState({ state: 'idle', message: '' });
    const [dbStatus, setDbStatus] = useState({ state: 'idle', message: '' });

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (config.ollama.enabled && config.ollama.baseUrl) {
            fetchModels();
        }
    }, [config.ollama.enabled, config.ollama.baseUrl]);

    const loadConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/config`);
            setConfig(prev => ({
                ...prev,
                ...res.data,
                ollama: { ...prev.ollama, ...res.data.ollama },
                rag: { ...prev.rag, ...res.data.rag }
            }));
        } catch (err) {
            console.error('Errore caricamento config:', err);
        }
    };

    const fetchModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await axios.get(`${API_BASE}/ollama/models`);
            setAvailableModels(res.data);
            if (!res.data.includes(config.ollama.model) && res.data.length > 0) {
                setConfig(prev => ({ ...prev, ollama: { ...prev.ollama, model: res.data[0] } }));
            }
        } catch (err) {
            console.error('Impossibile recuperare i modelli:', err);
            setAvailableModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const testOllama = async () => {
        setOllamaStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            const url = new URL(config.ollama.baseUrl);
            const res = await axios.post(`${API_BASE}/test/ollama`, {
                host: url.protocol + '//' + url.hostname,
                port: url.port
            });
            setOllamaStatus({ state: res.data.connected ? 'connected' : 'error', message: res.data.message });
            if (res.data.connected) fetchModels();
        } catch (err) {
            setOllamaStatus({ state: 'error', message: '❌ Errore di comunicazione con il backend.' });
        }
    };

    const testRag = async () => {
        if (!config.rag.baseUrl) {
            setRagStatus({ state: 'error', message: 'Inserisci l’URL di ChromaDB' });
            return;
        }
        setRagStatus({ state: 'testing', message: 'Verifica connessione...' });
        try {
            const res = await axios.post(`${API_BASE}/rag/test-connection`, {
                baseUrl: config.rag.baseUrl
            });
            setRagStatus({ state: res.data.connected ? 'connected' : 'error', message: res.data.message });
        } catch (err) {
            setRagStatus({ state: 'error', message: err.response?.data?.message || err.message });
        }
    };

    const testDB = async () => {
        setDbStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            const res = await axios.post(`${API_BASE}/test/db`, { type: config.database.type, path: config.database.path });
            setDbStatus({ state: res.data.connected ? 'connected' : 'error', message: res.data.message });
        } catch (err) {
            setDbStatus({ state: 'error', message: '❌ Errore di comunicazione con il backend.' });
        }
    };

    const handleSave = async () => {
        try {
            await axios.put(`${API_BASE}/config`, config);
            alert('✅ Configurazione salvata con successo!');
            onClose();
        } catch (err) {
            console.error(err);
            alert('❌ Errore nel salvataggio della configurazione.');
        }
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            idle: 'bg-gray-100 text-gray-500',
            testing: 'bg-blue-100 text-blue-600',
            connected: 'bg-green-100 text-green-700',
            error: 'bg-red-100 text-red-700'
        };
        const icons = {
            idle: <span className="text-xs">In attesa</span>,
            testing: <Loader2 size={14} className="animate-spin" />,
            connected: <CheckCircle size={14} />,
            error: <AlertCircle size={14} />
        };
        return (
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${colors[status.state]}`}>
                {icons[status.state]} <span className="truncate max-w-[200px]">{status.message}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
                <h2 className="text-xl font-bold mb-6">⚙️ Configurazione Sistema</h2>

                <div className="space-y-6">
                    {/* OLLAMA */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <label className="flex items-center gap-2 font-medium mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.ollama.enabled}
                                onChange={e => setConfig({ ...config, ollama: { ...config.ollama, enabled: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            🤖 Attiva LLM Locale (Ollama)
                        </label>

                        <div className="space-y-3 mt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
                                <input
                                    value={config.ollama.baseUrl}
                                    onChange={e => setConfig({ ...config, ollama: { ...config.ollama, baseUrl: e.target.value } })}
                                    placeholder="http://localhost:11434"
                                    className="w-full p-2 border rounded text-sm font-mono"
                                />
                            </div>

                            {config.ollama.enabled && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-medium text-gray-600">Modello</label>
                                        <button onClick={fetchModels} disabled={isLoadingModels} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                            {isLoadingModels ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Aggiorna lista
                                        </button>
                                    </div>
                                    <select
                                        value={config.ollama.model}
                                        onChange={e => setConfig({ ...config, ollama: { ...config.ollama, model: e.target.value } })}
                                        className="w-full p-2 border rounded bg-white text-sm"
                                        disabled={availableModels.length === 0}
                                    >
                                        {availableModels.length === 0 ? (
                                            <option>Nessun modello trovato (verifica connessione)</option>
                                        ) : (
                                            availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                        )}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            <button onClick={testOllama} disabled={ollamaStatus.state === 'testing'} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                                {ollamaStatus.state === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Verifica Connessione
                            </button>
                            <StatusBadge status={ollamaStatus} />
                        </div>
                    </div>

                    {/* RAG (ChromaDB) */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <label className="flex items-center gap-2 font-medium mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.rag?.enabled || false}
                                onChange={e => setConfig({ ...config, rag: { ...config.rag, enabled: e.target.checked, baseUrl: config.rag?.baseUrl || 'http://localhost:8000' } })}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            🧠 RAG con ChromaDB (analisi approfondita)
                        </label>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">URL ChromaDB</label>
                                <input
                                    value={config.rag?.baseUrl || 'http://localhost:8000'}
                                    onChange={e => setConfig({ ...config, rag: { ...config.rag, baseUrl: e.target.value, enabled: config.rag?.enabled || false } })}
                                    placeholder="http://localhost:8000"
                                    className="w-full p-2 border rounded text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Modello embedding (Ollama)</label>
                                <input
                                    value={config.rag?.embeddingModel || 'nomic-embed-text'}
                                    onChange={e => setConfig({ ...config, rag: { ...config.rag, embeddingModel: e.target.value, enabled: config.rag?.enabled || false } })}
                                    placeholder="nomic-embed-text"
                                    className="w-full p-2 border rounded text-sm font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-1">Assicurati di aver scaricato il modello: <code className="bg-gray-200 px-1 rounded">ollama pull nomic-embed-text</code></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            <button onClick={testRag} disabled={ragStatus.state === 'testing' || !config.rag?.enabled} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                                {ragStatus.state === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Verifica Connessione
                            </button>
                            <StatusBadge status={ragStatus} />
                        </div>

                        {/* Note esplicative */}
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <strong>ℹ️ Come avviare ChromaDB (RAG)</strong><br />
                            ChromaDB è un server vettoriale necessario per la ricerca semantica dei chunk durante l'analisi approfondita.<br />
                            Puoi avviarlo in due modi:
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                <li><strong>Con Docker:</strong> <code className="bg-blue-100 px-1 rounded">docker run -d -p 8000:8000 --name chroma-server chromadb/chroma:latest</code></li>
                                <li><strong>Con Python (pip):</strong>
                                    <br /><code className="bg-blue-100 px-1 rounded">pip install chromadb</code>
                                    <br /><code className="bg-blue-100 px-1 rounded">chroma run --host localhost --port 8000</code>
                                </li>
                            </ul>
                            Una volta avviato, imposta qui l'URL (es. <code className="bg-blue-100 px-1 rounded">http://localhost:8000</code>) e premi "Verifica Connessione".
                            <br />
                            <strong>Nota:</strong> Il RAG è utilizzato solo nella fase di analisi approfondita (se abilitato), non nell'analisi DFD base.
                        </div>
                    </div>

                    {/* DATABASE */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <label className="flex items-center gap-2 font-medium mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.database.enabled}
                                onChange={e => setConfig({ ...config, database: { ...config.database, enabled: e.target.checked } })}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            🗄️ Attiva Database Locale
                        </label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <select value={config.database.type} onChange={e => setConfig({ ...config, database: { ...config.database, type: e.target.value } })} className="p-2 border rounded">
                                <option value="sqlite">SQLite</option>
                                <option value="postgres">PostgreSQL (prossimo step)</option>
                            </select>
                            <input value={config.database.path} onChange={e => setConfig({ ...config, database: { ...config.database, path: e.target.value } })} placeholder="Path file DB" className="p-2 border rounded" />
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                            <button onClick={testDB} disabled={dbStatus.state === 'testing'} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                                {dbStatus.state === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Verifica Connessione
                            </button>
                            <StatusBadge status={dbStatus} />
                        </div>
                    </div>

                    {/* JSON STORAGE PATH */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                        <label className="font-medium mb-2 block">📁 Cartella salvataggio JSON</label>
                        <input value={config.jsonStoragePath} onChange={e => setConfig({ ...config, jsonStoragePath: e.target.value })} className="w-full p-2 border rounded" placeholder="./threat-models/" />
                    </div>

                    <button onClick={handleSave} className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 shadow-sm transition">
                        <Save size={18} /> Salva Configurazione
                    </button>
                </div>
            </div>
        </div>
    );
}