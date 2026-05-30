/**
 * ConfigPanel - Pannello di configurazione a tab per impostare LLM, RAG, Database, JSON Storage e Progetto
 * 
 * @module components/ConfigPanel
 * 
 * @description
 * Componente modale per la configurazione globale dell'applicazione:
 * - 🤖 LLM (Ollama): URL, modello, toggle attivazione, test connessione, fetch modelli disponibili
 * - 🧠 RAG (ChromaDB): modalità HTTP/Python, URL/script path, embedding model, toggle, test connessione
 * - 🗄️ Database: tipo (SQLite), percorso file, toggle, test connessione
 * - 📁 JSON Storage: percorso directory di salvataggio
 * - 📌 Progetto: nome, versione, proprietario
 * 
 * Utilizza `configApi` per le operazioni CRUD sulla configurazione e `apiClient` per endpoint diagnostici specifici.
 * 
 * ## Flusso dati
 * 1. All'apertura, carica la configurazione via `configApi.get()`
 * 2. Popola i form con i valori letti
 * 3. I toggle abilitano/disabilitano sezioni UI dinamicamente
 * 4. I test di connessione chiamano endpoint dedicati (`/test/ollama`, `/rag/test-connection`, `/test/db`)
 * 5. Il salvataggio invia la configurazione pulita via `configApi.update()`
 * 
 * @see {@link ../api/configApi.js} Layer API per operazioni di configurazione
 * @see {@link ../config/api.js} Istanza axios per chiamate diagnostiche
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Play, CheckCircle, AlertCircle, Loader2, RefreshCw, Wrench, Database, HardDrive, FolderOpen, Settings } from 'lucide-react';
import { configApi } from '../api/configApi';
import { apiClient } from '../config/api';

/**
 * Definizione delle tab disponibili nel pannello.
 * @type {Array<{id: string, label: string, icon: JSX.Element}>}
 */
const tabs = [
    { id: 'ollama', label: '🤖 LLM (Ollama)', icon: <Wrench size={16} /> },
    { id: 'rag', label: '🧠 RAG (ChromaDB)', icon: <Database size={16} /> },
    { id: 'database', label: '🗄️ Database', icon: <HardDrive size={16} /> },
    { id: 'storage', label: '📁 JSON Storage', icon: <FolderOpen size={16} /> },
    { id: 'project', label: '📌 Progetto', icon: <Settings size={16} /> }
];

/**
 * Componente modale per la configurazione globale a tab.
 * @param {Object} props - Proprietà del componente
 * @param {() => void} props.onClose - Callback da chiamare alla chiusura del modale
 * @returns {JSX.Element} Interfaccia di configurazione con tab e toggle
 */
export default function ConfigPanel({ onClose }) {
    // Stato tab attiva
    const [activeTab, setActiveTab] = useState('ollama');

    // Stato configurazione (valori di default + caricati dal backend)
    const [config, setConfig] = useState({
        ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' },
        project: { name: 'Nuovo Progetto', version: '1.0', owner: '' },
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
                pythonCmd: '',
                timeout: 30000
            },
            persistDirectory: './chroma_data'
        }
    });

    // Stato UI: modelli Ollama, status test, loading
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ state: 'idle', message: '' });
    const [ragStatus, setRagStatus] = useState({ state: 'idle', message: '' });
    const [dbStatus, setDbStatus] = useState({ state: 'idle', message: '' });
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Carica la configurazione dal backend all'apertura del modale.
     */
    useEffect(() => {
        loadConfig();
    }, []);

    /**
     * Fetch automatico dei modelli Ollama quando cambiano baseUrl o enabled.
     */
    useEffect(() => {
        if (config.ollama.enabled && config.ollama.baseUrl) {
            fetchModels();
        }
    }, [config.ollama.enabled, config.ollama.baseUrl]);

    /**
     * Recupera la configurazione completa dal backend.
     */
    const loadConfig = async () => {
        try {
            const data = await configApi.getConfig();
            setConfig(prev => ({
                ...prev,
                ...data,
                ollama: { ...prev.ollama, ...data.ollama },
                rag: {
                    ...prev.rag,
                    ...data.rag,
                    pythonBridge: { ...prev.rag.pythonBridge, ...data.rag?.pythonBridge }
                },
                database: { ...prev.database, ...data.database },
                project: { ...prev.project, ...data.project }
            }));
        } catch (err) {
            console.error('Errore caricamento config:', err);
            setRagStatus({ state: 'error', message: 'Impossibile caricare la configurazione dal server' });
        }
    };

    /**
     * Recupera la lista dei modelli disponibili da Ollama.
     */
    const fetchModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await configApi.getOllamaModels();
            const models = Array.isArray(res) ? res : (res.models || []);
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

    /**
     * Testa la connettività verso Ollama con fallback diretto all'API.
     */
    const testOllama = async () => {
        if (!config.ollama.baseUrl) {
            setOllamaStatus({ state: 'error', message: 'Inserisci un URL valido per Ollama' });
            return;
        }
        setOllamaStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            // Prova endpoint di test backend
            const url = new URL(config.ollama.baseUrl);
            const res = await apiClient.post('/ollama/test', {
                host: url.protocol + '//' + url.hostname,
                port: url.port || (url.protocol === 'https:' ? '443' : '80')
            }, { timeout: 5000 });

            setOllamaStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
            if (res.data.connected) fetchModels();
        } catch (err) {
            // Fallback: chiamata diretta all'API di Ollama
            try {
                await apiClient.get(`${config.ollama.baseUrl}/api/tags`, { timeout: 3000 });
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

    /**
     * Testa la connettività verso ChromaDB (RAG).
     */
    const testRag = async () => {
        const rag = config.rag;
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
            const res = await apiClient.post('/rag/test-connection', {
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

    /**
     * Testa la connettività verso il database configurato.
     */
    const testDB = async () => {
        setDbStatus({ state: 'testing', message: 'Verifica in corso...' });
        try {
            const res = await apiClient.post('/test/db', {
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

    /**
     * Salva la configurazione aggiornata sul backend.
     */
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Pulisce valori null/undefined prima dell'invio
            const cleanConfig = JSON.parse(JSON.stringify(config, (key, value) =>
                value === null || value === undefined ? undefined : value
            ));
            await configApi.updateConfig(cleanConfig);
            setRagStatus({ state: 'connected', message: '✅ Configurazione salvata!' });
            setTimeout(() => onClose(), 800);
        } catch (err) {
            console.error('Errore salvataggio config:', err);
            alert('❌ Errore nel salvataggio: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Aggiorna un campo annidato nella configurazione (supporta path tipo 'rag.pythonBridge.scriptPath').
     * @param {string} path - Percorso del campo (dot notation)
     * @param {any} value - Nuovo valore
     */
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

    /**
     * Componente badge per visualizzare lo stato dei test di connessione.
     * @param {{ status: { state: string, message: string } }} props
     * @returns {JSX.Element}
     */
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
                {/* Pulsante chiudi */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition"
                    aria-label="Chiudi configurazione"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-gray-800">⚙️ Configurazione Sistema</h2>

                {/* ========== TAB NAVIGATION ========== */}
                <div className="flex flex-wrap gap-2 border-b mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ========== TAB CONTENT ========== */}
                <div className="space-y-6">

                    {/* 🤖 Tab OLLAMA */}
                    {activeTab === 'ollama' && (
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
                    )}

                    {/* 🧠 Tab RAG */}
                    {activeTab === 'rag' && (
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalità di connessione</label>
                                        <div className="flex gap-3">
                                            <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${config.rag.mode === 'http-server'
                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                }`}>
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
                                            <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition ${config.rag.mode === 'python-client'
                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                }`}>
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
                                    {config.rag.mode === 'http-server' && (
                                        <div className="space-y-4">
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
                                    {config.rag.mode === 'python-client' && (
                                        <div className="space-y-4">
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
                        </section>
                    )}

                    {/* 🗄️ Tab DATABASE */}
                    {activeTab === 'database' && (
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
                    )}

                    {/* 📁 Tab JSON STORAGE */}
                    {activeTab === 'storage' && (
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
                    )}

                    {/* 📌 Tab PROGETTO */}
                    {activeTab === 'project' && (
                        <section className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome Progetto</label>
                                    <input
                                        value={config.project.name}
                                        onChange={e => updateField('project.name', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="Nuovo Progetto"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Versione</label>
                                    <input
                                        value={config.project.version || '1.0'}
                                        onChange={e => updateField('project.version', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="1.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Proprietario</label>
                                    <input
                                        value={config.project.owner || ''}
                                        onChange={e => updateField('project.owner', e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="Nome o team"
                                    />
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* ========== PULSANTE SALVA GLOBALE ========== */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Salvataggio in corso...' : 'Salva Configurazione'}
                </button>
            </div>
        </div>
    );
}