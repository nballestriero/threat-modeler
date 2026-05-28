import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash, Eye, X, Check, Loader2 } from 'lucide-react';
import { useThreatModelStore } from '../store/useThreatModelStore';

export default function AssetInventory() {
    const { assets, isLoading, fetchAssets, deleteAsset, updateAsset } = useThreatModelStore();
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', category: '', description: '' });
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAssets();
        axios.get('/api/dfd-taxonomy')
            .then(res => setDfdTaxonomy(res.data))
            .catch(() => setDfdTaxonomy({
                categories: [
                    { name: 'External Entity', color: '#1E40AF', colorBg: '#DBEAFE' },
                    { name: 'Process', color: '#B45309', colorBg: '#FEF3C7' },
                    { name: 'Data Store', color: '#047857', colorBg: '#D1FAE5' }
                ]
            }));
    }, []);

    const getCategoryStyle = (catName) => {
        const cat = dfdTaxonomy?.categories?.find(c => c.name === catName);
        return cat ? { bg: cat.colorBg, text: cat.color } : { bg: '#f3f4f6', text: '#1f2937' };
    };

    const handleEdit = (asset) => {
        setSelectedAsset(asset);
        setEditForm({ name: asset.name, category: asset.category, description: asset.description || '' });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        setLoading(true);
        await updateAsset(selectedAsset.id, editForm);
        setShowEditModal(false);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare questo asset base?')) await deleteAsset(id);
    };

    if (isLoading) return <div className="p-4">Caricamento asset...</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Fase 2: Asset Base (DFD)</h2>
            <div className="overflow-x-auto">
                <table className="w-full border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Nome</th>
                            <th className="p-2">Tipo DFD</th>
                            <th className="p-2">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => {
                            const style = getCategoryStyle(asset.category);
                            return (
                                <tr key={asset.id} className="border-b">
                                    <td className="p-2">{asset.name}</td>
                                    <td className="p-2">
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                            style={{ backgroundColor: style.bg, color: style.text }}
                                        >
                                            {asset.category}
                                        </span>
                                    </td>
                                    <td className="p-2 flex gap-2">
                                        <button onClick={() => { setSelectedAsset(asset); setShowDetailModal(true); }} className="text-blue-600"><Eye size={16} /></button>
                                        <button onClick={() => handleEdit(asset)} className="text-amber-600"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(asset.id)} className="text-red-600"><Trash size={16} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modale dettagli */}
            {showDetailModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between"><h3 className="text-lg font-bold">Dettagli Asset Base</h3><button onClick={() => setShowDetailModal(false)}><X size={20} /></button></div>
                        <p className="mt-2"><strong>Nome:</strong> {selectedAsset.name}</p>
                        <p><strong>Tipo DFD:</strong> {selectedAsset.category}</p>
                        <p><strong>Descrizione:</strong> {selectedAsset.description || 'Nessuna descrizione.'}</p>
                    </div>
                </div>
            )}

            {/* Modale modifica */}
            {showEditModal && selectedAsset && dfdTaxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Modifica Asset Base</h3>
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border p-2 rounded mb-2" placeholder="Nome" />
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full border p-2 rounded mb-2">
                            {dfdTaxonomy.categories.map(cat => (
                                <option key={cat.name} value={cat.name} style={{ backgroundColor: cat.colorBg, color: cat.color }}>{cat.name}</option>
                            ))}
                        </select>
                        <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Descrizione" className="w-full border p-2 rounded mb-2 h-24" />
                        <button onClick={handleSaveEdit} disabled={loading} className="w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Salva
                        </button>
                        <button onClick={() => setShowEditModal(false)} className="mt-2 w-full bg-gray-300 p-2 rounded">Annulla</button>
                    </div>
                </div>
            )}
        </div>
    );
}