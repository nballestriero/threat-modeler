/**
 * @file Pannello di configurazione globale con interfaccia a tab
 * @module components/ConfigPanel
 * 
 * @description
 * Interfaccia amministrativa completa per configurare tutti i servizi esterni dell'applicazione.
 * Organizzata in tab per migliorare l'usabilità: Progetto, Ollama, Database, RAG.
 * Ogni tab include test di connessione in tempo reale e validazione input.
 * 
 * ## Struttura tab
 * - **Progetto**: nome, descrizione, percorso storage JSON
 * - **Ollama**: URL, modello, fetch lista modelli, test connessione
 * - **Database**: tipo (SQLite/PostgreSQL), percorso, test connessione
 * - **RAG/ChromaDB**: URL, embedding model, bridge Python, test connessione
 * 
 * ## Funzionalità avanzate
 * - Navigazione a tab con stato visivo
 * - Test di connessione per ogni servizio con feedback immediato
 * - Fetch automatico lista modelli Ollama
 * - Salvataggio unificato con conferma e gestione errori
 * 
 * @see {@link ../api/configApi.js} Layer API per configurazione
 * @see {@link ../api/ollamaApi.js} API per gestione modelli Ollama
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Save, Play, CheckCircle, AlertCircle, Loader2, RefreshCw,
    Database, Cpu, Folder, Server, Terminal, Settings, Layers
} from 'lucide-react';

// ✅ Usa variabile d'ambiente con fallback
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

/**
 * Badge di stato per test di connessione
 * @param {{state: string, message: string}} status - Stato del test
 * @returns {JSX.Element} Badge colorato con icona e messaggio
 */
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
            {icons[status.state]}
            <span className="truncate max-w-[200px]">{status.message}</span>
        </div>
    );
};

/**
 * Componente pannello configurazione con tab.
 * @param {{onClose?: () => void}} props - Callback opzionale per chiusura (se usato come modal)
 * @returns {JSX.Element} Form di configurazione completo con tab
 */
export default function ConfigPanel({ onClose }) {
    // Stato tab attivo
    const [activeTab, setActiveTab] = useState('project');

    // Stato configurazione con valori di default completi
    const [config, setConfig] = useState({
        // 📁 Progetto
        project: {
            name: 'Default Project',
            description: '',
            jsonStoragePath: './threat-models/'
        },

        // 🤖 Ollama LLM
        ollama: {
            enabled: false,
            baseUrl: 'http://localhost:11434',
            model: 'llama3.1:8b'
        },

        // 🗄️ Database
        database: {
            enabled: false,
            type: 'sqlite', // 'sqlite' | 'postgresql'
            path: './data.db',
            connectionString: ''
        },

        // 🧠 RAG / ChromaDB
        rag: {
            enabled: false,
            mode: 'python-client', // 'http-server' | 'python-client'
            baseUrl: 'http://localhost:8000',
            embeddingModel: 'nomic-embed-text',
            collectionPrefix: 'threatmodel_',
            persistDirectory: './chroma_data',
            pythonBridge: {
                enabled: true,
                scriptPath: './services/rag_bridge.py',
                pythonCmd: '', // Vuoto = usa default .venv
                timeout: 30000
            }
        }
    });

    // Stati UI per test
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ state: 'idle', message: '' });
    const [ragStatus, setRagStatus] = useState({ state: 'idle', message: '' });
    const [dbStatus, setDbStatus] = useState({ state: 'idle', message: '' });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    /**
     * Carica la configurazione dal backend all'avvio
     */
    useEffect(() => {
        loadConfig();
    }, []);

    /**
     * Fetch automatico modelli Ollama quando cambia la configurazione
     */
    useEffect(() => {
        if (config.ollama.enabled && config.ollama.baseUrl) {
            fetchModels();
        }
    }, [config.ollama.enabled, config.ollama.baseUrl]);

    /**
     * Recupera configurazione dal backend con merge sicuro
     */
    const loadConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/config`);
            setConfig(prev => ({
                ...prev,
                ...res.data,
                project: { ...prev.project, ...res.data.project },
                ollama: { ...prev.ollama, ...res.data.ollama },
                database: { ...prev.database, ...res.data.database },
                rag: {
                    ...prev.rag,
                    ...res.data.rag,
                    pythonBridge: { ...prev.rag?.pythonBridge, ...res.data.rag?.pythonBridge }
                }
            }));
        } catch (err) {
            console.warn('Impossibile caricare configurazione, uso default:', err.message);
            setFeedback({ type: 'error', message: 'Configurazione di default caricata. Verifica il backend.' });
        }
    };

    /**
     * Fetch lista modelli disponibili da Ollama
     */
    const fetchModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await axios.get(`${API_BASE}/ollama/models`);
            const models = res.data || [];
            setAvailableModels(models);

            // Se il modello corrente non è nella lista, usa il primo disponibile
            if (models.length > 0 && !models.includes(config.ollama.model)) {
                setConfig(prev => ({
                    ...prev,
                    ollama: { ...prev.ollama, model: models[0] }
                }));
            }
        } catch (err) {
            console.error('Impossibile recuperare modelli Ollama:', err.message);
            setAvailableModels([]);
            setOllamaStatus({ state: 'error', message: 'Impossibile connettersi a Ollama' });
        } finally {
            setIsLoadingModels(false);
        }
    };

    /**
     * Test connessione a Ollama
     */
    const testOllama = async () => {
        setOllamaStatus({ state: 'testing', message: 'Verifica in corso...' });

        try {
            const url = new URL(config.ollama.baseUrl);
            const res = await axios.post(`${API_BASE}/test/ollama`, {
                host: url.protocol + '//' + url.hostname,
                port: url.port || (url.protocol === 'https:' ? '443' : '11434')
            });

            const status = res.data.connected ? 'connected' : 'error';
            setOllamaStatus({ state: status, message: res.data.message });

            if (res.data.connected) {
                fetchModels(); // Aggiorna lista modelli se connesso
            }
        } catch (err) {
            setOllamaStatus({
                state: 'error',
                message: err.response?.data?.message || '❌ Errore di comunicazione con Ollama'
            });
        }
    };

    /**
     * Test connessione a ChromaDB/RAG
     */
    const testRag = async () => {
        if (!config.rag.baseUrl && config.rag.mode === 'http-server') {
            setRagStatus({ state: 'error', message: 'Inserisci l\'URL di ChromaDB' });
            return;
        }

        setRagStatus({ state: 'testing', message: 'Verifica connessione...' });

        try {
            const payload = config.rag.mode === 'http-server'
                ? { baseUrl: config.rag.baseUrl }
                : {
                    mode: 'python-client',
                    pythonCmd: config.rag.pythonBridge?.pythonCmd || '',
                    scriptPath: config.rag.pythonBridge?.scriptPath || './services/rag_bridge.py'
                };

            const res = await axios.post(`${API_BASE}/rag/test-connection`, payload);
            setRagStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
        } catch (err) {
            setRagStatus({
                state: 'error',
                message: err.response?.data?.message || err.message || '❌ Errore di comunicazione con RAG'
            });
        }
    };

    /**
     * Test connessione al database
     */
    const testDB = async () => {
        setDbStatus({ state: 'testing', message: 'Verifica in corso...' });

        try {
            const res = await axios.post(`${API_BASE}/test/db`, {
                type: config.database.type,
                path: config.database.path,
                connectionString: config.database.connectionString
            });

            setDbStatus({
                state: res.data.connected ? 'connected' : 'error',
                message: res.data.message
            });
        } catch (err) {
            setDbStatus({
                state: 'error',
                message: err.response?.data?.message || '❌ Errore di comunicazione con il database'
            });
        }
    };

    /**
     * Salva la configurazione sul backend
     */
    const handleSave = async () => {
        setSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            await axios.put(`${API_BASE}/config`, config);
            setFeedback({ type: 'success', message: '✅ Configurazione salvata con successo!' });

            // Auto-hide feedback dopo 3 secondi
            setTimeout(() => setFeedback({ type: '', message: '' }), 3000);

            // Chiudi modal se presente
            if (onClose) onClose();
        } catch (err) {
            setFeedback({
                type: 'error',
                message: err.response?.data?.error || '❌ Errore nel salvataggio della configurazione.'
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper per aggiornare campi nidificati
    const updateNested = (section, key, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
    };

    const updateRagBridge = (key, value) => {
        setConfig(prev => ({
            ...prev,
            rag: {
                ...prev.rag,
                pythonBridge: { ...prev.rag.pythonBridge, [key]: value }
            }
        }));
    };

    // Definizione tab
    const tabs = [
        { id: 'project', label: 'Progetto', icon: Folder },
        { id: 'ollama', label: 'Ollama', icon: Cpu },
        { id: 'database', label: 'Database', icon: Database },
        { id: 'rag', label: 'RAG', icon: Server }
    ];

    // Render contenuto tab
    const renderTabContent = () => {
        switch (activeTab) {

            // ========== TAB: PROGETTO ==========
            case 'project':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Progetto</label>
                            <input
                                value={config.project.name}
                                onChange={e => updateNested('project', 'name', e.target.value)}
                                placeholder="Nome del progetto"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                            <textarea
                                value={config.project.description}
                                onChange={e => updateNested('project', 'description', e.target.value)}
                                placeholder="Descrizione opzionale del progetto"
                                rows={3}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Percorso Storage JSON
                                <span className="text-xs text-gray-400 ml-1">(relativo a backend/)</span>
                            </label>
                            <input
                                value={config.project.jsonStoragePath}
                                onChange={e => updateNested('project', 'jsonStoragePath', e.target.value)}
                                placeholder="./threat-models/"
                                className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                I file threat-model.json dei progetti verranno salvati in questa directory.
                            </p>
                        </div>
                    </div>
                );

            // ========== TAB: OLLAMA ==========
            case 'ollama':
                return (
                    <div className="space-y-4">
                        {/* Toggle abilitazione */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="ollama-enabled"
                                checked={config.ollama.enabled}
                                onChange={e => updateNested('ollama', 'enabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="ollama-enabled" className="text-sm font-medium text-gray-700">
                                Abilita integrazione Ollama
                            </label>
                        </div>

                        {/* Configurazione base */}
                        <div className={`space-y-4 ${!config.ollama.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                                <input
                                    value={config.ollama.baseUrl}
                                    onChange={e => updateNested('ollama', 'baseUrl', e.target.value)}
                                    placeholder="http://localhost:11434"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>

                            {/* Selezione modello con fetch */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Modello</label>
                                    <button
                                        onClick={fetchModels}
                                        disabled={isLoadingModels || !config.ollama.enabled}
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isLoadingModels ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                        Aggiorna lista
                                    </button>
                                </div>
                                <select
                                    value={config.ollama.model}
                                    onChange={e => updateNested('ollama', 'model', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    disabled={availableModels.length === 0 || !config.ollama.enabled}
                                >
                                    {availableModels.length === 0 ? (
                                        <option>Nessun modello trovato (verifica connessione)</option>
                                    ) : (
                                        availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Test connessione */}
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Test Connessione</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={testOllama}
                                    disabled={ollamaStatus.state === 'testing' || !config.ollama.enabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition"
                                >
                                    {ollamaStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                    Verifica Connessione
                                </button>
                                <StatusBadge status={ollamaStatus} />
                            </div>
                        </div>
                    </div>
                );

            // ========== TAB: DATABASE ==========
            case 'database':
                return (
                    <div className="space-y-4">
                        {/* Toggle abilitazione */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="db-enabled"
                                checked={config.database.enabled}
                                onChange={e => updateNested('database', 'enabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="db-enabled" className="text-sm font-medium text-gray-700">
                                Abilita database persistente
                            </label>
                        </div>

                        {/* Configurazione base */}
                        <div className={`space-y-4 ${!config.database.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Database</label>
                                <select
                                    value={config.database.type}
                                    onChange={e => updateNested('database', 'type', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="sqlite">SQLite (file locale)</option>
                                    <option value="postgresql">PostgreSQL (server remoto)</option>
                                </select>
                            </div>

                            {config.database.type === 'sqlite' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Percorso File SQLite</label>
                                    <input
                                        value={config.database.path}
                                        onChange={e => updateNested('database', 'path', e.target.value)}
                                        placeholder="./data.db"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Percorso relativo alla root del backend</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection String PostgreSQL</label>
                                    <input
                                        value={config.database.connectionString}
                                        onChange={e => updateNested('database', 'connectionString', e.target.value)}
                                        placeholder="postgresql://user:pass@host:5432/dbname"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Formato: postgresql://utente:password@host:porta/database</p>
                                </div>
                            )}
                        </div>

                        {/* Test connessione */}
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Test Connessione</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={testDB}
                                    disabled={dbStatus.state === 'testing' || !config.database.enabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 transition"
                                >
                                    {dbStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                    Verifica Connessione
                                </button>
                                <StatusBadge status={dbStatus} />
                            </div>
                        </div>
                    </div>
                );

            // ========== TAB: RAG / CHROMADB ==========
            case 'rag':
                return (
                    <div className="space-y-4">
                        {/* Toggle abilitazione */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="rag-enabled"
                                checked={config.rag?.enabled || false}
                                onChange={e => updateNested('rag', 'enabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="rag-enabled" className="text-sm font-medium text-gray-700">
                                Abilita RAG con ChromaDB
                            </label>
                        </div>

                        {/* Configurazione base */}
                        <div className={`space-y-4 ${!config.rag?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>

                            {/* Modalità di esecuzione */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modalità</label>
                                <select
                                    value={config.rag?.mode || 'python-client'}
                                    onChange={e => updateNested('rag', 'mode', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                >
                                    <option value="http-server">🌐 Server HTTP esterno (ChromaDB in esecuzione)</option>
                                    <option value="python-client">🐍 Bridge Python locale (esecuzione diretta)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {config.rag?.mode === 'http-server'
                                        ? 'Usa un server ChromaDB già avviato. Richiede solo l\'URL.'
                                        : 'Esegue lo script Python bridge direttamente. Richiede ambiente virtuale.'}
                                </p>
                            </div>

                            {/* Configurazione HTTP */}
                            {config.rag?.mode === 'http-server' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL ChromaDB</label>
                                    <input
                                        value={config.rag?.baseUrl || ''}
                                        onChange={e => updateNested('rag', 'baseUrl', e.target.value)}
                                        placeholder="http://localhost:8000"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                </div>
                            )}

                            {/* Configurazione Python Bridge */}
                            {config.rag?.mode === 'python-client' && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                                        <Terminal size={16} className="text-amber-600" /> Ambiente Python
                                    </label>
                                    <input
                                        value={config.rag.pythonBridge?.pythonCmd || ''}
                                        onChange={e => updateRagBridge('pythonCmd', e.target.value)}
                                        placeholder="Lascia vuoto per usare backend/.venv automaticamente"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition mb-2"
                                    />
                                    <p className="text-xs text-gray-600">
                                        Esempi: <code className="bg-amber-100 px-1 rounded">./.venv/Scripts/python.exe</code> (Win)
                                        o <code className="bg-amber-100 px-1 rounded">./.venv/bin/python3</code> (Linux/Mac)
                                    </p>
                                </div>
                            )}

                            {/* Impostazioni avanzate */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modello Embedding</label>
                                    <input
                                        value={config.rag?.embeddingModel || 'nomic-embed-text'}
                                        onChange={e => updateNested('rag', 'embeddingModel', e.target.value)}
                                        placeholder="nomic-embed-text"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Assicurati di aver scaricato: <code className="bg-gray-200 px-1 rounded">ollama pull nomic-embed-text</code>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prefisso Collezioni</label>
                                    <input
                                        value={config.rag?.collectionPrefix || 'threatmodel_'}
                                        onChange={e => updateNested('rag', 'collectionPrefix', e.target.value)}
                                        placeholder="threatmodel_"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Test connessione */}
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Test Connessione</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={testRag}
                                    disabled={ragStatus.state === 'testing' || !config.rag?.enabled}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50 transition"
                                >
                                    {ragStatus.state === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                    Verifica Connessione
                                </button>
                                <StatusBadge status={ragStatus} />
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header con pulsante chiudi */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
                        aria-label="Chiudi"
                    >
                        <X size={20} />
                    </button>
                )}

                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-gray-600" />
                    ⚙️ Configurazione Sistema
                </h2>

                {/* Feedback globale */}
                {feedback.message && (
                    <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${feedback.type === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                        {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                        {feedback.message}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex border-b mb-4">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content - scrollable */}
                <div className="flex-1 overflow-y-auto pr-2">
                    {renderTabContent()}
                </div>

                {/* Footer con pulsante salva */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                        >
                            Annulla
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                    </button>
                </div>

            </div>
        </div>
    );
}