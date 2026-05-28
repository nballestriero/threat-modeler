import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash, Sparkles, Loader2, Eye } from 'lucide-react';

export default function MethodologyView({ method }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editAsset, setEditAsset] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDescModal, setShowDescModal] = useState(false);
    const [selectedDesc, setSelectedDesc] = useState('');
    const [editForm, setEditForm] = useState({ name: '', category: '', subCategory: '', description: '' });
    const [taxonomy, setTaxonomy] = useState(null);
    const baseURL = `/api/methodologies/${method}`;

    useEffect(() => {
        axios.get(`${baseURL}/taxonomy`).then(res => setTaxonomy(res.data)).catch(console.error);
    }, [method]);

    const fetchAssets = async () => {
        const res = await axios.get(`${baseURL}/assets`);
        setAssets(res.data);
    };

    useEffect(() => {
        fetchAssets();
    }, [method]);

    const enrichAll = async () => {
        setLoading(true);
        try {
            await axios.post(`${baseURL}/enrich`, {});
            await fetchAssets();
        } catch (err) {
            alert('Errore arricchimento');
        }
        setLoading(false);
    };

    const handleEdit = (asset) => {
        setEditAsset(asset);
        setEditForm({
            name: asset.name,
            category: asset.category,
            subCategory: asset.subCategory || '',
            description: asset.description || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        await axios.put(`${baseURL}/assets/${editAsset.id}`, editForm);
        await fetchAssets();
        setShowEditModal(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare?')) {
            await axios.delete(`${baseURL}/assets/${id}`);
            await fetchAssets();
        }
    };

    const handleShowDesc = (desc) => {
        setSelectedDesc(desc || 'Nessuna descrizione');
        setShowDescModal(true);
    };

    const getCategoryStyle = (catName) => {
        if (!taxonomy) return { bg: '#f3f4f6', text: '#1f2937' };
        const cat = taxonomy.categories.find(c => c.name === catName);
        return cat ? { bg: cat.colorBg, text: cat.color } : { bg: '#f3f4f6', text: '#1f2937' };
    };

    if (!taxonomy) return <div className="p-4">Caricamento tassonomia...</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestione asset – {method}</h2>
                <button onClick={enrichAll} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Arricchisci tutti
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border">
                    <thead className="bg-gray-100">
                        <tr><th className="p-2">Nome</th><th className="p-2">Categoria</th><th className="p-2">Sottocategoria</th><th className="p-2">Azioni</th></tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => {
                            const style = getCategoryStyle(asset.category);
                            return (
                                <tr key={asset.id} className="border-b">
                                    <td className="p-2">{asset.name}</td>
                                    <td className="p-2">{asset.category ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: style.bg, color: style.text }}>{asset.category}</span> : '-'}</td>
                                    <td className="p-2">{asset.subCategory || '-'}</td>
                                    <td className="p-2 flex gap-2">
                                        <button onClick={() => handleShowDesc(asset.description)} className="text-blue-600"><Eye size={16} /></button>
                                        <button onClick={() => handleEdit(asset)} className="text-amber-600"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(asset.id)} className="text-red-600"><Trash size={16} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modale descrizione */}
            {showDescModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-2">Descrizione</h3>
                        <p className="text-sm">{selectedDesc}</p>
                        <button onClick={() => setShowDescModal(false)} className="mt-4 w-full bg-gray-300 p-2 rounded">Chiudi</button>
                    </div>
                </div>
            )}

            {/* Modale modifica con dropdown colorati */}
            {showEditModal && editAsset && taxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Modifica Asset</h3>
                        <input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                            placeholder="Nome"
                        />
                        <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value, subCategory: '' })}
                            className="w-full border p-2 rounded mb-2"
                        >
                            <option value="">Seleziona categoria</option>
                            {taxonomy.categories.map(cat => (
                                <option key={cat.name} value={cat.name} style={{ backgroundColor: cat.colorBg, color: cat.color }}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={editForm.subCategory}
                            onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                        >
                            <option value="">Nessuna sottocategoria</option>
                            {editForm.category && taxonomy.categories.find(c => c.name === editForm.category)?.subcategories.map(sub => (
                                <option key={sub.name} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                        <textarea
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Descrizione"
                            className="w-full border p-2 rounded mb-2 h-24"
                        />
                        <button onClick={handleSaveEdit} className="w-full bg-green-600 text-white p-2 rounded">Salva</button>
                        <button onClick={() => setShowEditModal(false)} className="mt-2 w-full bg-gray-300 p-2 rounded">Annulla</button>
                    </div>
                </div>
            )}
        </div>
    );
}