/**
 * @file Pannello di configurazione globale (RAG, Ollama, Progetto)
 * @module components/ConfigPanel
 * 
 * @description
 * Interfaccia amministrativa per configurare i servizi esterni dell'applicazione.
 * Gestisce il caricamento e il salvataggio della configurazione globale tramite API.
 * Il campo "Percorso Ambiente Python" viene visualizzato SOLO quando la modalità RAG 
 * è impostata su `python-client`, evitando confusione per chi usa `http-server`.
 * 
 * ## Funzionalità
 * - Caricamento configurazione all'avvio
 * - Aggiornamento dinamico dello stato locale
 * - Rendering condizionale del campo Python in base alla modalità RAG
 * - Salvataggio asincrono con feedback visivo (loading, successo, errore)
 * 
 * @see {@link ../api/configApi.js} Layer API per configurazione
 * @see {@link ../store/useProjectStore.js} Store progetti (non usato direttamente qui)
 */

import React, { useEffect, useState } from 'react';
import { configApi } from '../api/configApi';
import { Save, Loader2, Server, Terminal, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Componente pannello configurazione globale.
 * @returns {JSX.Element} Form di configurazione RAG/Ollama
 */
export default function ConfigPanel() {
    // Stato configurazione
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    /**
     * Carica la configurazione globale dal backend all'avvio.
     */
    useEffect(() => {
        loadConfig();
    }, []);

    /**
     * Recupera configurazione via API.
     * @async
     */
    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await configApi.getConfig();
            // Merge con default per sicurezza
            setConfig({
                rag: { enabled: true, mode: 'http-server', baseUrl: '', pythonEnvPath: '', ...data.rag },
                ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'llama3.1:8b', ...data.ollama }
            });
        } catch (err) {
            console.error('Errore caricamento config:', err);
            setFeedback({ type: 'error', message: 'Impossibile caricare la configurazione. Verifica il backend.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Aggiorna un campo nidificato nello stato configurazione.
     * @param {string} section - Sezione root ('rag' | 'ollama')
     * @param {string} key - Chiave da aggiornare
     * @param {any} value - Nuovo valore
     */
    const updateNested = (section, key, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
    };

    /**
     * Salva la configurazione modificata sul backend.
     * @async
     */
    const handleSave = async () => {
        setSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            // Rimuovi campi undefined/null prima dell'invio
            const payload = {
                rag: { ...config.rag },
                ollama: { ...config.ollama }
            };

            await configApi.updateConfig(payload);
            setFeedback({ type: 'success', message: 'Configurazione salvata correttamente.' });
        } catch (err) {
            console.error('Errore salvataggio config:', err);
            setFeedback({ type: 'error', message: err.response?.data?.error || 'Errore durante il salvataggio.' });
        } finally {
            setSaving(false);
        }
    };

    // Stato di caricamento iniziale
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="ml-3 text-gray-600">Caricamento configurazione...</span>
            </div>
        );
    }

    // Fallback errore critico
    if (!config) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded text-red-700">
                <AlertCircle size={20} className="inline mr-2" />
                Configurazione non disponibile. Riavvia l'applicazione o verifica il server.
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                ⚙️ Configurazione Globale
            </h2>

            {/* ========== SEZIONE RAG ========== */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-700">
                    <Server size={18} /> RAG / ChromaDB
                </h3>

                {/* Modalità RAG */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalità di esecuzione</label>
                    <select
                        value={config.rag?.mode || 'http-server'}
                        onChange={e => updateNested('rag', 'mode', e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    >
                        <option value="http-server">🌐 Server HTTP esterno (consigliato per produzione)</option>
                        <option value="python-client">🐍 Bridge Python locale (esecuzione diretta)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        {config.rag?.mode === 'http-server'
                            ? 'Utilizza un server ChromaDB già avviato. Richiede solo l\'URL di connessione.'
                            : 'Avvia automaticamente lo script Python. Richiede un ambiente virtuale funzionante.'}
                    </p>
                </div>

                {/* URL/Endpoint (sempre visibile) */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {config.rag?.mode === 'http-server' ? 'URL Server ChromaDB' : 'Percorso Script Python'}
                    </label>
                    <input
                        type="text"
                        value={config.rag?.baseUrl || ''}
                        onChange={e => updateNested('rag', 'baseUrl', e.target.value)}
                        placeholder={config.rag?.mode === 'http-server' ? 'http://localhost:8000' : 'path/to/rag_service.py'}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>

                {/* ✅ CAMPO PERCORSO PYTHON: VISIBILE SOLO IN MODALITÀ PYTHON-CLIENT */}
                {config.rag?.mode === 'python-client' && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <Terminal size={16} className="text-amber-600" /> Ambiente Python (.venv)
                        </label>
                        <p className="text-xs text-gray-600 mb-3">
                            Lascia vuoto per usare automaticamente <code className="bg-amber-100 px-1 rounded">backend/.venv</code>.
                            Specifica il percorso assoluto all'eseguibile Python solo se il tuo ambiente virtuale si trova altrove.
                        </p>
                        <input
                            type="text"
                            value={config.rag?.pythonEnvPath || ''}
                            onChange={e => updateNested('rag', 'pythonEnvPath', e.target.value)}
                            placeholder="Es: C:\\path\\to\\.venv\\Scripts\\python.exe o /usr/bin/python3"
                            className="w-full p-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                )}

                {/* Toggle Abilitazione */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t">
                    <input
                        type="checkbox"
                        id="rag-enabled"
                        checked={config.rag?.enabled ?? true}
                        onChange={e => updateNested('rag', 'enabled', e.target.checked)}
                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="rag-enabled" className="text-sm font-medium text-gray-700">
                        Abilita integrazione RAG
                    </label>
                </div>
            </div>

            {/* ========== SEZIONE OLLAMA ========== */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-700">
                    🦙 Ollama LLM
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Base</label>
                        <input
                            type="text"
                            value={config.ollama?.baseUrl || ''}
                            onChange={e => updateNested('ollama', 'baseUrl', e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modello Default</label>
                        <input
                            type="text"
                            value={config.ollama?.model || ''}
                            onChange={e => updateNested('ollama', 'model', e.target.value)}
                            placeholder="llama3.1:8b"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t">
                    <input
                        type="checkbox"
                        id="ollama-enabled"
                        checked={config.ollama?.enabled ?? true}
                        onChange={e => updateNested('ollama', 'enabled', e.target.checked)}
                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="ollama-enabled" className="text-sm font-medium text-gray-700">
                        Abilita Ollama
                    </label>
                </div>
            </div>

            {/* ========== FEEDBACK & SALVATAGGIO ========== */}
            {feedback.message && (
                <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                    {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    {feedback.message}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Salvataggio in corso...' : 'Salva Configurazione'}
            </button>
        </div>
    );
}