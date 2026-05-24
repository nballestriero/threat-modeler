import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Database, BookOpen, CheckCircle, AlertCircle, Loader2, Trash2, Play, Eye } from 'lucide-react';

export default function DocumentationManager({ onAssetsExtracted }) {
  const [activeTab, setActiveTab] = useState('docs');
  const [files, setFiles] = useState({ docs: [], csv: [], context: [] });
  const [loading, setLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectedContext, setSelectedContext] = useState([]);
  const [llmStatus, setLlmStatus] = useState({ state: 'idle', message: '' });

  //useEffect(() => fetchFiles(), []);
  useEffect(() => { fetchFiles()}, []);

  const fetchFiles = async () => {
    const types = ['docs', 'csv', 'context'];
    const newFiles = {};
    for (const t of types) {
      const res = await axios.get(`http://localhost:3001/api/files/${t}`);
      newFiles[t] = res.data;
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
        const res = await axios.post('http://localhost:3001/api/validate-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCsvResult(res.data);
      } else {
        await axios.post(`http://localhost:3001/api/upload/${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      fetchFiles();
    } catch (e) { alert('Errore upload'); }
    setLoading(false);
  };

  const deleteFile = async (type, filename) => {
    await axios.delete(`http://localhost:3001/api/files/${type}/${filename}`);
    fetchFiles();
    if (type === 'csv') setCsvResult(null);
    if (type === 'docs') setSelectedDocs(prev => prev.filter(f => f.name !== filename));
    if (type === 'context') setSelectedContext(prev => prev.filter(f => f.name !== filename));
  };

  const runLLMExtraction = async () => {
    if (selectedDocs.length === 0) return alert('Seleziona almeno un documento.');
    setLoading(true);
    setLlmStatus({ state: 'testing', message: '🤖 Analisi LLM in corso...' });
    try {
      const res = await axios.post('http://localhost:3001/api/analyze/extract-assets', {
        docFiles: selectedDocs.map(f => f.path),
        contextFiles: selectedContext.map(f => f.path)
      });
      if (res.data.error) {
        setLlmStatus({ state: 'error', message: res.data.error });
      } else {
        setLlmStatus({ state: 'connected', message: `✅ Estratti ${res.data.count} asset.` });
        if (onAssetsExtracted) onAssetsExtracted(res.data.assets);
      }
    } catch (e) {
      setLlmStatus({ state: 'error', message: 'Errore comunicazione backend' });
    }
    setLoading(false);
  };

  const importCSV = async () => {
    if (!csvResult?.assets?.length) return;
    setLoading(true);
    await axios.post('http://localhost:3001/api/assets/import', { assets: csvResult.assets });
    alert(`✅ Importati ${csvResult.assets.length} asset nel progetto.`);
    setCsvResult(null);
    fetchFiles();
    setLoading(false);
  };

  const ToggleSelect = ({ list, item, type }) => {
    const isActive = list.some(f => f.name === item.name);
    const toggle = type === 'docs' ? setSelectedDocs : setSelectedContext;
    return (
      <button onClick={() => toggle(isActive ? list.filter(f => f.name !== item.name) : [...list, item])}
        className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${isActive ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}>
        <span className="truncate text-sm">{item.name}</span>
        <div className="flex gap-2">
          <Eye size={14} className="text-gray-400" />
          {isActive ? <CheckCircle size={14} className="text-blue-600"/> : <div className="w-3.5 h-3.5 border rounded-full"/>}
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="flex gap-4 mb-4 border-b">
        {['docs', 'csv', 'context'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 font-medium text-sm flex items-center gap-2 ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
            {t === 'docs' && <><FileText size={16}/> Documentazione</>}
            {t === 'csv' && <><Database size={16}/> CSV Asset</>}
            {t === 'context' && <><BookOpen size={16}/> Contesto</>}
          </button>
        ))}
      </div>

      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input id="upload-docs" type="file" accept=".pdf,.md,.html,.tex,.txt" className="hidden" onChange={() => handleUpload('docs')} />
            <label htmlFor="upload-docs" className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 flex items-center gap-2">
              <Upload size={16} /> Carica Documentazione
            </label>
            <button onClick={runLLMExtraction} disabled={selectedDocs.length === 0 || loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Play size={16}/>} Analizza con LLM
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Documenti disponibili</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.docs.map(f => <ToggleSelect key={f.name} list={selectedDocs} item={f} type="docs" />)}
                {files.docs.length === 0 && <p className="text-sm text-gray-400">Nessun file</p>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">File contesto selezionati</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedContext.map(f => <span key={f.name} className="block px-3 py-1 bg-gray-100 rounded text-sm truncate">{f.name}</span>)}
                {selectedContext.length === 0 && <p className="text-sm text-gray-400">Nessun contesto</p>}
              </div>
            </div>
          </div>
          <StatusBadge status={llmStatus} />
        </div>
      )}

      {activeTab === 'csv' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input id="upload-csv" type="file" accept=".csv" className="hidden" onChange={() => handleUpload('csv')} />
            <label htmlFor="upload-csv" className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 flex items-center gap-2">
              <Upload size={16} /> Carica & Valida CSV
            </label>
          </div>
          {csvResult && (
            <div className="border rounded p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                {csvResult.valid ? <CheckCircle size={18} className="text-green-600"/> : <AlertCircle size={18} className="text-red-600"/>}
                <span className="font-medium">{csvResult.valid ? '✅ CSV Valido' : '❌ Errori di validazione'}</span>
                <span className="text-sm text-gray-500">({csvResult.count} righe)</span>
              </div>
              {csvResult.valid ? (
                <button onClick={importCSV} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {loading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>} Importa {csvResult.count} Asset
                </button>
              ) : (
                <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-24">{JSON.stringify(csvResult.errors, null, 2)}</pre>
              )}
              <details className="mt-2">
                <summary className="text-sm cursor-pointer text-blue-600">Anteprima primi 5 record</summary>
                <pre className="text-xs mt-1 bg-white p-2 rounded border max-h-32 overflow-auto">{JSON.stringify(csvResult.preview, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}

      {activeTab === 'context' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input id="upload-context" type="file" accept=".pdf,.md,.html,.tex,.txt" className="hidden" onChange={() => handleUpload('context')} />
            <label htmlFor="upload-context" className="px-4 py-2 bg-amber-600 text-white rounded cursor-pointer hover:bg-amber-700 flex items-center gap-2">
              <Upload size={16} /> Carica Contesto/Research
            </label>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.context.map(f => (
              <div key={f.name} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                <span className="text-sm truncate">{f.name}</span>
                <button onClick={() => deleteFile('context', f.name)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">ℹ️ I file contesto verranno inclusi nel prompt LLM durante l'analisi della documentazione.</p>
        </div>
      )}
    </div>
  );
}

const StatusBadge = ({ status }) => {
  const colors = { idle: 'bg-gray-100 text-gray-500', testing: 'bg-blue-100 text-blue-600', connected: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700' };
  const icons = { idle: '', testing: <Loader2 size={14} className="animate-spin"/>, connected: <CheckCircle size={14}/>, error: <AlertCircle size={14}/> };
  return status.state !== 'idle' ? (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${colors[status.state]}`}>
      {icons[status.state]} {status.message}
    </div>
  ) : null;
};