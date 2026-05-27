import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Pencil, Sparkles, Plus, X, Check, Loader2, Trash } from 'lucide-react';
import { useThreatModelStore } from '../store/useThreatModelStore';

const API_BASE = 'http://localhost:3001/api';

export default function AssetInventory() {
    const { assets, isLoading, fetchAssets, deleteAsset } = useThreatModelStore();
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', category: '', subCategory: '', description: '' });
    const [enhancingId, setEnhancingId] = useState(null);
    const [taxonomy, setTaxonomy] = useState(null);
    const [taxonomyLoading, setTaxonomyLoading] = useState(true);

    useEffect(() => {
        fetchAssets();
        loadTaxonomy();
    }, [fetchAssets]);

    const loadTaxonomy = async () => {
        try {
            const res = await axios.get(`${API_BASE}/taxonomy`);
            setTaxonomy(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setTaxonomyLoading(false);
        }
    };

    const getCategoryStyle = (catName) => {
        if (!taxonomy) return { bg: '#f3f4f6', text: '#1f2937' };
        const cat = taxonomy.categories.find(c => c.name === catName);
        return cat ? { bg: cat.colorBg, text: cat.color } : { bg: '#f3f4f6', text: '#1f2937' };
    };

    const handleCreate = () => {
        if (!taxonomy) return;
        setFormData({ name: '', category: taxonomy.categories[0]?.name || 'Data', subCategory: '', description: '' });
        setSelectedAsset(null);
        setIsEditModalOpen(true);
    };

    const handleEdit = (asset) => {
        setSelectedAsset(asset);
        setFormData({
            name: asset.name,
            category: asset.category,
            subCategory: asset.subCategory || '',
            description: asset.description || ''
        });
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo asset?")) return;
        try {
            await deleteAsset(id);
        } catch (error) {
            alert("Impossibile eliminare l'asset.");
        }
    };

    const handleSave = async () => {
        try {
            if (selectedAsset) {
                await axios.put(`${API_BASE}/assets/${selectedAsset.id}`, formData);
            } else {
                await axios.post(`${API_BASE}/assets`, formData);
            }
            setIsEditModalOpen(false);
            fetchAssets();
        } catch (err) {
            alert('Errore durante il salvataggio');
        }
    };

    const handleEnhance = async (id) => {
        if (!id) return;
        setEnhancingId(id);
        try {
            const res = await axios.post(`${API_BASE}/assets/${id}/enhance`);
            if (res.data.success) {
                await fetchAssets();
                alert('✅ Asset migliorato con successo!');
            } else {
                alert(res.data.message || 'Nessuna modifica applicata');
            }
        } catch (err) {
            alert('❌ Errore durante il miglioramento: ' + (err.response?.data?.error || err.message));
        } finally {
            setEnhancingId(null);
        }
    };

    if (taxonomyLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /> Caricamento tassonomia...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">📦 Fase 2: Gestione Asset</h2>
                <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1">
                    <Plus size={14} /> Nuovo Asset
                </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Puoi modificare, eliminare o aggiungere asset manualmente. Usa il pulsante ✨ per migliorare la descrizione con AI.</p>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-3 text-sm font-medium text-gray-600">Nome</th>
                            <th className="p-3 text-sm font-medium text-gray-600">Categoria</th>
                            <th className="p-3 text-sm font-medium text-gray-600">Sottocategoria</th>
                            <th className="p-3 text-sm font-medium text-gray-600 w-32">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" className="p-4 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                        ) : (
                            assets.map(a => {
                                const style = getCategoryStyle(a.category);
                                return (
                                    <tr key={a.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{a.name}</td>
                                        <td className="p-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
                                                {a.category}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500">{a.subCategory || '-'}</td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => { setSelectedAsset(a); setIsDetailModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Dettagli"><Eye size={18} /></button>
                                            <button onClick={() => handleEdit(a)} className="p-1 text-amber-600 hover:bg-amber-100 rounded" title="Modifica"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(a.id)} className="p-1 hover:bg-red-100 text-red-600 rounded" title="Elimina"><Trash size={18} /></button>
                                            <button onClick={() => handleEnhance(a.id)} disabled={enhancingId === a.id} className="p-1 text-purple-600 hover:bg-purple-100 rounded disabled:opacity-50" title="Migliora con AI">
                                                {enhancingId === a.id ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Dettagli */}
            {isDetailModalOpen && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                        <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        <h3 className="text-lg font-bold mb-4">Dettagli Asset</h3>
                        <div className="space-y-3 text-sm">
                            <p><span className="font-medium">ID:</span> <code className="bg-gray-100 px-1 rounded">{selectedAsset.id}</code></p>
                            <p><span className="font-medium">Nome:</span> {selectedAsset.name}</p>
                            <p><span className="font-medium">Categoria:</span> {selectedAsset.category}</p>
                            <p><span className="font-medium">Sottocategoria:</span> {selectedAsset.subCategory || 'N/A'}</p>
                            <p><span className="font-medium">Descrizione:</span> {selectedAsset.description || 'Nessuna descrizione.'}</p>
                            {selectedAsset.contextChunk && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-blue-600 text-xs">Testo originale</summary>
                                    <p className="text-xs bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-auto">{selectedAsset.contextChunk}</p>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit/Create */}
            {isEditModalOpen && taxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
                        <h3 className="text-lg font-bold mb-4">{selectedAsset ? 'Modifica Asset' : 'Nuovo Asset'}</h3>
                        <div className="space-y-4">
                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome asset" className="w-full p-2 border rounded" />
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: '' })} className="w-full p-2 border rounded">
                                {taxonomy.categories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                            <select key={formData.category} value={formData.subCategory} onChange={e => setFormData({ ...formData, subCategory: e.target.value })} className="w-full p-2 border rounded">
                                <option value="">Nessuna sottocategoria</option>
                                {taxonomy.categories.find(c => c.name === formData.category)?.subcategories.map(sub => (
                                    <option key={sub.name} value={sub.name}>{sub.name}</option>
                                ))}
                            </select>
                            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descrizione" className="w-full p-2 border rounded h-24" />
                            <button onClick={handleSave} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center justify-center gap-2">
                                <Check size={16} /> Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}