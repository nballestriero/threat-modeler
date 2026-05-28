import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Database, BookOpen, CheckCircle, AlertCircle, Loader2, Trash2, Play, Eye } from 'lucide-react';
import { useThreatModelStore } from '../store/useThreatModelStore';

const API_BASE = 'http://localhost:3001/api';

export default function DocumentationManager() {
    const { syncExtractedAssets, fetchAssets } = useThreatModelStore();
    const [activeTab, setActiveTab] = useState('docs');
    const [files, setFiles] = useState({ docs: [], csv: [], context: [] });
    const [loading, setLoading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [selectedContext, setSelectedContext] = useState([]);
    const [llmStatus, setLlmStatus] = useState({ state: 'idle', message: '' });
    const [llmEnabled, setLlmEnabled] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);

    useEffect(() => {
        fetchFiles();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/config`);
            setLlmEnabled(res.data.ollama?.enabled === true);
            if (!res.data.ollama?.enabled) {
                setLlmStatus({ state: 'error', message: '⚠️ LLM non abilitato. Vai su Configurazione per attivarlo.' });
            }
        } catch (err) {
            console.error(err);
            setLlmEnabled(false);
        } finally {
            setConfigLoading(false);
        }
    };

    const fetchFiles = async () => {
        const types = ['docs', 'csv', 'context'];
        const newFiles = {};
        for (const t of types) {
            try {
                const res = await axios.get(`${API_BASE}/files/${t}`);
                newFiles[t] = res.data;
            } catch { newFiles[t] = []; }
        }
        setFiles(newFiles);
    };

    const handleUpload = async (type) => {
        const input = document.getElementById(`upload-${type}`);
        if (!input.files[0]) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', input.files[0]);
        try {
            if (type === 'csv') {
                const res = await axios.post(`${API_BASE}/validate-csv`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setCsvResult(res.data);
            } else {
                await axios.post(`${API_BASE}/upload/${type}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            fetchFiles();
        } catch (e) { alert('Errore upload'); }
        setLoading(false);
    };

    const deleteFile = async (type, filename) => {
        await axios.delete(`${API_BASE}/files/${type}/${filename}`);
        fetchFiles();
        if (type === 'csv') setCsvResult(null);
        if (type === 'docs') setSelectedDocs(prev => prev.filter(f => f.name !== filename));
        if (type === 'context') setSelectedContext(prev => prev.filter(f => f.name !== filename));
    };

    const runDfdExtraction = async () => {
        if (!llmEnabled) return alert('LLM non abilitato nella configurazione.');
        if (selectedDocs.length === 0) return alert('Seleziona almeno un documento.');

        setLoading(true);
        setLlmStatus({ state: 'testing', message: '🤖 Analisi DFD base in corso...' });

        try {
            const res = await axios.post(`${API_BASE}/analyze/extract-assets-dfd`, {
                docFiles: selectedDocs.map(f => f.path),
                contextFiles: selectedContext.map(f => f.path)
            });

            if (res.data.error) {
                setLlmStatus({ state: 'error', message: res.data.error });
            } else {
                // ✅ Invio diretto degli asset (il backend restituisce già 'category')
                await syncExtractedAssets(res.data.assets);
                setLlmStatus({ state: 'connected', message: `✅ Estratti ${res.data.count} asset (DFD base).` });
                alert(`Analisi DFD base completata: ${res.data.count} asset trovati. Passa alla fase Asset per rivederli.`);
            }
        } catch (e) {
            console.error(e);
            setLlmStatus({ state: 'error', message: 'Errore comunicazione backend o LLM offline.' });
        }
        setLoading(false);
    };

    const importCSV = async () => {
        if (!csvResult?.assets?.length) return;
        setLoading(true);
        await axios.post(`${API_BASE}/assets/import`, { assets: csvResult.assets });
        alert(`✅ Importati ${csvResult.assets.length} asset nel progetto.`);
        setCsvResult(null);
        fetchFiles();
        await fetchAssets();
        setLoading(false);
    };

    const ToggleSelect = ({ list, item, type }) => {
        const isActive = list.some(f => f.name === item.name);
        const toggle = type === 'docs' ? setSelectedDocs : setSelectedContext;
        return (
            <button onClick={() => toggle(isActive ? list.filter(f => f.name !== item.name) : [...list, item])}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${isActive ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-400' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <span className="truncate text-sm font-medium">{item.name}</span>
                <div className="flex gap-2 items-center">
                    {!isActive && <Eye size={14} className="text-gray-400" />}
                    {isActive ? <CheckCircle size={14} className="text-blue-600" /> : <div className="w-3.5 h-3.5 border rounded-full border-gray-300" />}
                </div>
            </button>
        );
    };

    const isAnalyzeDisabled = !llmEnabled || selectedDocs.length === 0 || loading || configLoading;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📄 Fase 1: Caricamento e Analisi DFD Base</h2>
            <p className="text-sm text-gray-500 mb-6">Carica documentazione, file CSV di asset, e contesto. Usa l'LLM per estrarre asset secondo la tassonomia DFD (External Entity, Process, Data Store).</p>

            <div className="flex gap-4 mb-6 border-b">
                {['docs', 'csv', 'context'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 ${activeTab === t ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        {t === 'docs' && <><FileText size={18} /> Documentazione</>}
                        {t === 'csv' && <><Database size={18} /> CSV Asset</>}
                        {t === 'context' && <><BookOpen size={18} /> Contesto</>}
                    </button>
                ))}
            </div>

            {activeTab === 'docs' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                        <input id="upload-docs" type="file" accept=".pdf,.md,.html,.tex,.txt" className="hidden" onChange={() => handleUpload('docs')} />
                        <label htmlFor="upload-docs" className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition flex items-center gap-2 shadow-sm font-medium text-sm">
                            <Upload size={16} /> Carica Documentazione
                        </label>

                        <div className="h-8 w-px bg-gray-300 mx-2"></div>

                        <button
                            onClick={runDfdExtraction}
                            disabled={isAnalyzeDisabled}
                            className={`px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm transition-all ${isAnalyzeDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                            Analizza DFD base
                        </button>

                        {!llmEnabled && <span className="ml-auto text-xs text-red-600">⚠️ LLM non abilitato</span>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" /> Documenti disponibili
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {files.docs.length > 0 ? files.docs.map(f => <ToggleSelect key={f.name} list={selectedDocs} item={f} type="docs" />)
                                    : <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-dashed"><Upload size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">Nessun file caricato</p></div>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <BookOpen size={16} className="text-amber-500" /> Contesto Aggiuntivo
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {files.context.length > 0 ? files.context.map(f => <ToggleSelect key={f.name} list={selectedContext} item={f} type="context" />)
                                    : <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-dashed"><p className="text-sm">Nessun file contesto</p></div>}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">ℹ️ I file contesto arricchiscono il prompt dell'LLM.</p>
                        </div>
                    </div>

                    {llmStatus.state !== 'idle' && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${llmStatus.state === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : llmStatus.state === 'connected' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                            <div className="mt-0.5">
                                {llmStatus.state === 'testing' && <Loader2 size={18} className="animate-spin" />}
                                {llmStatus.state === 'connected' && <CheckCircle size={18} />}
                                {llmStatus.state === 'error' && <AlertCircle size={18} />}
                            </div>
                            <span className="text-sm font-medium">{llmStatus.message}</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'csv' && (
                <div className="space-y-4">
                    <input id="upload-csv" type="file" accept=".csv" className="hidden" onChange={() => handleUpload('csv')} />
                    <label htmlFor="upload-csv" className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 flex items-center gap-2 shadow-sm w-fit">
                        <Upload size={16} /> Carica & Valida CSV
                    </label>
                    {csvResult && (
                        <div className="border rounded p-4 bg-gray-50">
                            <div className="flex items-center gap-2 mb-3">
                                {csvResult.valid ? <CheckCircle size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-red-600" />}
                                <span className="font-medium">{csvResult.valid ? '✅ CSV Valido' : '❌ Errori di validazione'}</span>
                                <span className="text-sm text-gray-500">({csvResult.count} righe)</span>
                            </div>
                            {csvResult.valid ? (
                                <button onClick={importCSV} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Importa {csvResult.count} Asset
                                </button>
                            ) : (
                                <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-24">{JSON.stringify(csvResult.errors, null, 2)}</pre>
                            )}
                            <details className="mt-2">
                                <summary className="text-sm cursor-pointer text-blue-600">Anteprima</summary>
                                <pre className="text-xs mt-1 bg-white p-2 rounded border max-h-32 overflow-auto">{JSON.stringify(csvResult.preview, null, 2)}</pre>
                            </details>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'context' && (
                <div className="space-y-4">
                    <input id="upload-context" type="file" accept=".pdf,.md,.html,.tex,.txt" className="hidden" onChange={() => handleUpload('context')} />
                    <label htmlFor="upload-context" className="px-4 py-2 bg-amber-600 text-white rounded cursor-pointer hover:bg-amber-700 flex items-center gap-2 shadow-sm w-fit">
                        <Upload size={16} /> Carica Contesto/Research
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {files.context.map(f => (
                            <div key={f.name} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border">
                                <span className="text-sm truncate">{f.name}</span>
                                <button onClick={() => deleteFile('context', f.name)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}