import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Pencil, Sparkles, Plus, X, Check } from 'lucide-react';

const CATEGORIES = [
  { name: 'Data', subs: ['Raw Data', 'Pre-processed Data', 'Labeled/Training Data', 'Validation/Test Data', 'Inference/Input Data', 'Model Outputs'] },
  { name: 'Models & Algorithms', subs: ['Training Pipeline', 'Model Weights/Parameters', 'Hyperparameters/Configs', 'Pre-trained/External Models', 'Deployed Model/Service'] },
  { name: 'Infrastructure & Storage', subs: ['Databases', 'Object/File Storage', 'Compute', 'Network/Endpoints'] },
  { name: 'Processes & Workflows', subs: ['Data Ingestion', 'Model Training', 'CI/CD & Deployment', 'Monitoring & Retraining'] },
  { name: 'Actors & External Dependencies', subs: ['Internal Users/Teams', 'Third-party APIs', 'End Users/Clients'] },
  { name: 'AI-Specific Artefacts', subs: ['Prompts & Templates', 'Feature Store', 'Vector Databases', 'Evaluation Logs'] }
];

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', subCategory: '', description: '' });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const res = await axios.get('http://localhost:3001/api/assets');
    setAssets(res.data);
  };

  const handleCreate = () => {
    setFormData({ name: '', category: CATEGORIES[0].name, subCategory: '', description: '' });
    setIsEditModalOpen(true);
  };

  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    setFormData(asset);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (selectedAsset) {
      await axios.put(`http://localhost:3001/api/assets/${selectedAsset.id}`, formData);
    } else {
      await axios.post('http://localhost:3001/api/assets', formData);
    }
    setIsEditModalOpen(false);
    setSelectedAsset(null);
    fetchAssets();
  };

  const handleEnhance = async (id) => {
    const res = await axios.post(`http://localhost:3001/api/assets/${id}/enhance`);
    if (res.data.enhanced !== false) fetchAssets();
    else alert(res.data.message);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Elenco Asset</h2>
        <div className="space-x-2">
          <button onClick={() => handleEnhance(selectedAsset?.id || assets[0]?.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm flex items-center gap-1">
            <Sparkles size={14} /> Migliora con AI
          </button>
          <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1">
            <Plus size={14} /> Nuovo Asset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 text-sm font-medium text-gray-600">Nome</th>
              <th className="p-3 text-sm font-medium text-gray-600">Categoria</th>
              <th className="p-3 text-sm font-medium text-gray-600">Sottocategoria</th>
              <th className="p-3 text-sm font-medium text-gray-600 w-24">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3 text-gray-600">{a.category}</td>
                <td className="p-3 text-gray-500">{a.subCategory || '-'}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setSelectedAsset(a); setIsDetailModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Dettagli">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => handleEdit(a)} className="p-1 text-amber-600 hover:bg-amber-100 rounded" title="Modifica">
                    <Pencil size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {assets.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-gray-400">Nessun asset. Clicca "Nuovo Asset" per iniziare.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* MODAL DETTAGLI */}
      {isDetailModalOpen && selectedAsset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20}/></button>
            <h3 className="text-lg font-bold mb-4">Dettagli Asset</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">ID:</span> <code className="bg-gray-100 px-1 rounded">{selectedAsset.id}</code></p>
              <p><span className="font-medium">Nome:</span> {selectedAsset.name}</p>
              <p><span className="font-medium">Categoria:</span> {selectedAsset.category}</p>
              <p><span className="font-medium">Sottocategoria:</span> {selectedAsset.subCategory || 'N/A'}</p>
              <p><span className="font-medium">Descrizione:</span> {selectedAsset.description || 'Nessuna descrizione.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT/CREATE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20}/></button>
            <h3 className="text-lg font-bold mb-4">{selectedAsset ? 'Modifica Asset' : 'Nuovo Asset'}</h3>
            <div className="space-y-4">
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome asset" className="w-full p-2 border rounded" />
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subCategory: ''})} className="w-full p-2 border rounded">
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <select value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} className="w-full p-2 border rounded">
                <option value="">Nessuna sottocategoria</option>
                {CATEGORIES.find(c => c.name === formData.category)?.subs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrizione (nascosta nella tabella)" className="w-full p-2 border rounded h-24" />
              <button onClick={handleSave} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center justify-center gap-2">
                <Check size={16}/> Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}