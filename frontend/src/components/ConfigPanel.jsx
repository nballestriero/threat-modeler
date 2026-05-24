import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ConfigPanel({ onClose }) {
  const [config, setConfig] = useState({
    ollama: { enabled: false, host: 'http://localhost', port: 11434, apiKey: '' },
    database: { enabled: false, type: 'sqlite', path: './data.db' },
    jsonStoragePath: './threat-models/'
  });

  // Stati connessione (transienti, non salvati su JSON)
  const [ollamaStatus, setOllamaStatus] = useState({ state: 'idle', message: '' });
  const [dbStatus, setDbStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    axios.get('http://localhost:3001/api/config').then(res => setConfig(res.data)).catch(console.error);
  }, []);

  const testOllama = async () => {
    setOllamaStatus({ state: 'testing', message: 'Verifica in corso...' });
    try {
      const res = await axios.post('http://localhost:3001/api/test/ollama', { host: config.ollama.host, port: config.ollama.port });
      setOllamaStatus({ state: res.data.connected ? 'connected' : 'error', message: res.data.message });
    } catch {
      setOllamaStatus({ state: 'error', message: '❌ Errore di comunicazione con il backend.' });
    }
  };

  const testDB = async () => {
    setDbStatus({ state: 'testing', message: 'Verifica in corso...' });
    try {
      const res = await axios.post('http://localhost:3001/api/test/db', { type: config.database.type, path: config.database.path });
      setDbStatus({ state: res.data.connected ? 'connected' : 'error', message: res.data.message });
    } catch {
      setDbStatus({ state: 'error', message: '❌ Errore di comunicazione con il backend.' });
    }
  };

  const handleSave = async () => {
    await axios.post('http://localhost:3001/api/config', config);
    alert('✅ Configurazione salvata. Riavvia il server se richiesto.');
    onClose();
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
      testing: <Loader2 size={14} className="animate-spin"/>,
      connected: <CheckCircle size={14}/>,
      error: <AlertCircle size={14}/>
    };
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${colors[status.state]}`}>
        {icons[status.state]} {status.message}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20}/></button>
        <h2 className="text-xl font-bold mb-6">⚙️ Configurazione Sistema</h2>

        <div className="space-y-6">
          {/* OLLAMA */}
          <div className="border p-4 rounded-lg bg-gray-50">
            <label className="flex items-center gap-2 font-medium mb-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.ollama.enabled} 
                onChange={e => setConfig({...config, ollama: {...config.ollama, enabled: e.target.checked}})} 
                className="w-4 h-4 text-blue-600 rounded"
              />
              🤖 Attiva LLM Locale (Ollama)
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <input value={config.ollama.host} onChange={e => setConfig({...config, ollama: {...config.ollama, host: e.target.value}})} placeholder="Host" className="p-2 border rounded" />
              <input type="number" value={config.ollama.port} onChange={e => setConfig({...config, ollama: {...config.ollama, port: e.target.value}})} placeholder="Porta (11434)" className="p-2 border rounded" />
              <input value={config.ollama.apiKey} onChange={e => setConfig({...config, ollama: {...config.ollama, apiKey: e.target.value}})} placeholder="API Key (opzionale)" className="col-span-2 p-2 border rounded" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={testOllama} disabled={ollamaStatus.state === 'testing'} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {ollamaStatus.state === 'testing' ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>} Verifica Connessione
              </button>
              <StatusBadge status={ollamaStatus} />
            </div>
          </div>

          {/* DATABASE */}
          <div className="border p-4 rounded-lg bg-gray-50">
            <label className="flex items-center gap-2 font-medium mb-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.database.enabled} 
                onChange={e => setConfig({...config, database: {...config.database, enabled: e.target.checked}})} 
                className="w-4 h-4 text-blue-600 rounded"
              />
              🗄️ Attiva Database Locale
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <select value={config.database.type} onChange={e => setConfig({...config, database: {...config.database, type: e.target.value}})} className="p-2 border rounded">
                <option value="sqlite">SQLite</option>
                <option value="postgres">PostgreSQL (prossimo step)</option>
              </select>
              <input value={config.database.path} onChange={e => setConfig({...config, database: {...config.database, path: e.target.value}})} placeholder="Path file DB" className="p-2 border rounded" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={testDB} disabled={dbStatus.state === 'testing'} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {dbStatus.state === 'testing' ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>} Verifica Connessione
              </button>
              <StatusBadge status={dbStatus} />
            </div>
          </div>

          {/* JSON STORAGE */}
          <div className="border p-4 rounded-lg bg-gray-50">
            <label className="font-medium mb-2 block">📁 Cartella salvataggio JSON</label>
            <input value={config.jsonStoragePath} onChange={e => setConfig({...config, jsonStoragePath: e.target.value})} className="w-full p-2 border rounded" placeholder="./threat-models/" />
          </div>

          <button onClick={handleSave} className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 shadow-sm transition">
            <Save size={18} /> Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  );
}