import React, { useEffect, useState } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import { Eye, Pencil, Sparkles, Trash, Loader2, Check, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export default function Phase4AdvancedAssets() {
    const { assets, advancedAssets, fetchAdvancedAssets, enrichAssets, updateAdvancedAsset, deleteAdvancedAsset } = useThreatModelStore();
    const [loading, setLoading] = useState(false);
    const [enhancingId, setEnhancingId] = useState(null);
    const [editAsset, setEditAsset] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', category: '', subCategory: '', description: '' });
    const [taxonomy, setTaxonomy] = useState(null);

    useEffect(() => {
        fetchAdvancedAssets();
        axios.get(`${API_BASE}/taxonomy`).then(res => setTaxonomy(res.data)).catch(console.error);
    }, []);

    // Helper per ottenere stile categoria
    const getCategoryStyle = (catName) => {
        if (!taxonomy) return { bg: '#f3f4f6', text: '#1f2937' };
        const cat = taxonomy.categories.find(c => c.name === catName);
        return cat ? { bg: cat.colorBg, text: cat.color } : { bg: '#f3f4f6', text: '#1f2937' };
    };

    // Unisce asset base e avanzati
    const merged = assets.map(base => {
        const adv = advancedAssets.find(a => a.originalAssetId === base.id);
        return adv || {
            id: null,
            originalAssetId: base.id,
            name: base.name,
            category: '',
            subCategory: '',
            description: '',
            contextChunk: base.contextChunk
        };
    });

    const handleEnrichAll = async () => {
        console.log('🚀 Avvio arricchimento batch...');
        setLoading(true);
        try {
            await enrichAssets(assets.map(a => a.id));
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleEnhance = async (id) => {
        setEnhancingId(id);
        try {
            await axios.post(`${API_BASE}/advanced-assets/${id}/enhance`);
            await fetchAdvancedAssets();
            alert('Descrizione migliorata!');
        } catch (err) { alert('Errore miglioramento'); }
        finally { setEnhancingId(null); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare questo asset avanzato?')) {
            await deleteAdvancedAsset(id);
        }
    };

    const handleEdit = (asset) => {
        if (!asset.id) {
            alert('Prima arricchisci questo asset con il pulsante "Arricchisci tutti".');
            return;
        }
        setEditAsset(asset);
        setEditForm({
            name: asset.name,
            category: asset.category || '',
            subCategory: asset.subCategory || '',
            description: asset.description || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editAsset) return;
        await updateAdvancedAsset(editAsset.id, editForm);
        setShowEditModal(false);
        setEditAsset(null);
    };

    const handleViewDetails = (asset) => {
        setSelectedAsset(asset);
        setShowDetailModal(true);
    };

    if (!taxonomy) return <div className="p-4">Caricamento tassonomia...</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">📋 Fase 4: Asset Avanzati (STRIDE-AI)</h2>
                <button onClick={handleEnrichAll} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Arricchisci tutti
                </button>
            </div>
            {merged.length === 0 ? (
                <p>Nessun asset base. Torna alla fase 2.</p>
            ) : (
                <table className="w-full text-left border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Nome</th>
                            <th className="p-2">Categoria</th>
                            <th className="p-2">Sottocategoria</th>
                            <th className="p-2">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merged.map(asset => {
                            const catStyle = getCategoryStyle(asset.category);
                            return (
                                <tr key={asset.originalAssetId} className="border-b">
                                    <td className="p-2">{asset.name}</td>
                                    <td className="p-2">
                                        {asset.category ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>
                                                {asset.category}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-2">{asset.subCategory || '-'}</td>
                                    <td className="p-2 flex gap-2">
                                        <button onClick={() => handleViewDetails(asset)} className="text-blue-600" title="Dettagli">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(asset)} className="text-amber-600" title="Modifica">
                                            <Pencil size={16} />
                                        </button>
                                        {asset.id && (
                                            <button onClick={() => handleEnhance(asset.id)} disabled={enhancingId === asset.id} className="text-purple-600" title="Migliora con AI">
                                                {enhancingId === asset.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            </button>
                                        )}
                                        {asset.id && (
                                            <button onClick={() => handleDelete(asset.id)} className="text-red-600" title="Elimina">
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* MODALE DETTAGLI */}
            {showDetailModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Dettagli Asset Avanzato</h3>
                            <button onClick={() => setShowDetailModal(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-2">
                            <p><strong>Nome:</strong> {selectedAsset.name}</p>
                            <p><strong>Categoria:</strong> {selectedAsset.category || '-'}</p>
                            <p><strong>Sottocategoria:</strong> {selectedAsset.subCategory || '-'}</p>
                            <p><strong>Descrizione:</strong> {selectedAsset.description || 'Nessuna descrizione.'}</p>
                            {selectedAsset.contextChunk && (
                                <details>
                                    <summary className="cursor-pointer text-blue-600 text-sm">Testo originale</summary>
                                    <p className="text-xs bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-auto">{selectedAsset.contextChunk}</p>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE MODIFICA CON DROPDOWN COLORATI */}
            {showEditModal && editAsset && taxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Modifica Asset Avanzato</h3>
                            <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                        />
                        <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value, subCategory: '' })}
                            className="w-full border p-2 rounded mb-2"
                            style={{ backgroundColor: '#fff' }}
                        >
                            <option value="">Seleziona categoria</option>
                            {taxonomy.categories.map(c => {
                                const style = { backgroundColor: c.colorBg, color: c.color };
                                return (
                                    <option key={c.name} value={c.name} style={style}>
                                        {c.name}
                                    </option>
                                );
                            })}
                        </select>
                        <select
                            value={editForm.subCategory}
                            onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                        >
                            <option value="">Nessuna sottocategoria</option>
                            {editForm.category && taxonomy.categories.find(c => c.name === editForm.category)?.subcategories.map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                        <textarea
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Descrizione"
                            className="w-full border p-2 rounded mb-2 h-24"
                        />
                        <button onClick={handleSaveEdit} className="w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-2">
                            <Check size={16} /> Salva
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}