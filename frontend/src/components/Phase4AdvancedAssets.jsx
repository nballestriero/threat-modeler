import React, { useEffect, useState } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import { Pencil, Sparkles, Trash, Loader2, Check, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export default function Phase4AdvancedAssets() {
    const { assets, advancedAssets, fetchAdvancedAssets, enrichAssets, updateAdvancedAsset, deleteAdvancedAsset } = useThreatModelStore();
    const [loading, setLoading] = useState(false);
    const [enhancingId, setEnhancingId] = useState(null);
    const [editAsset, setEditAsset] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', category: '', subCategory: '', description: '' });
    const [taxonomy, setTaxonomy] = useState(null);

    useEffect(() => {
        fetchAdvancedAssets();
        axios.get(`${API_BASE}/taxonomy`).then(res => setTaxonomy(res.data)).catch(console.error);
    }, []);

    // Unisce asset base e avanzati: mostra una riga per ogni asset base,
    // se esiste già un avanzato lo usa; altrimenti mostra campi vuoti (ma permette arricchimento)
    const merged = assets.map(base => {
        const adv = advancedAssets.find(a => a.originalAssetId === base.id);
        return adv || {
            id: base.id, // nota: usiamo l'id dell'asset base come chiave provvisoria, ma per le operazioni di modifica serve l'id dell'avanzato
            originalAssetId: base.id,
            name: base.name,
            category: '',
            subCategory: '',
            description: '',
            contextChunk: base.contextChunk
        };
    });

    const handleEnrichAll = async () => {
        setLoading(true);
        await enrichAssets(assets.map(a => a.id));
        setLoading(false);
    };

    const handleEnhance = async (id) => {
        setEnhancingId(id);
        try {
            const res = await axios.post(`${API_BASE}/advanced-assets/${id}/enhance`);
            if (res.data.success) {
                await fetchAdvancedAssets();
                alert('Descrizione migliorata!');
            }
        } catch (err) {
            alert('Errore miglioramento');
        } finally {
            setEnhancingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare questo asset avanzato?')) {
            await deleteAdvancedAsset(id);
        }
    };

    const handleEdit = (asset) => {
        // Se asset.id non corrisponde a un asset avanzato (cioè è l'id dell'asset base), non possiamo modificarlo
        // perché non esiste ancora in advanced-assets.json. In tal caso, avvisiamo l'utente.
        if (!asset.originalAssetId) {
            alert('Prima arricchisci questo asset con il pulsante "Arricchisci tutti" o singolarmente (da implementare).');
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
                            <th className="p-2">Descrizione</th>
                            <th className="p-2">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {merged.map(asset => (
                            <tr key={asset.originalAssetId || asset.id} className="border-b">
                                <td className="p-2">{asset.name}</td>
                                <td className="p-2">{asset.category || '-'}</td>
                                <td className="p-2">{asset.subCategory || '-'}</td>
                                <td className="p-2">{asset.description ? asset.description.substring(0, 50) : '-'}</td>
                                <td className="p-2 flex gap-2">
                                    <button onClick={() => handleEdit(asset)} className="text-amber-600"><Pencil size={16} /></button>
                                    {/* Solo se esiste un id valido (non quello provvisorio dell'asset base) */}
                                    {asset.id && asset.id.length > 20 && (
                                        <button onClick={() => handleEnhance(asset.id)} disabled={enhancingId === asset.id} className="text-purple-600">
                                            {enhancingId === asset.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        </button>
                                    )}
                                    {asset.id && asset.id.length > 20 && (
                                        <button onClick={() => handleDelete(asset.id)} className="text-red-600"><Trash size={16} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showEditModal && editAsset && taxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Modifica Asset Avanzato</h3>
                            <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border p-2 rounded mb-2" />
                        <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value, subCategory: '' })} className="w-full border p-2 rounded mb-2">
                            <option value="">Seleziona categoria</option>
                            {taxonomy.categories.map(c => <option key={c.name}>{c.name}</option>)}
                        </select>
                        <select value={editForm.subCategory} onChange={e => setEditForm({ ...editForm, subCategory: e.target.value })} className="w-full border p-2 rounded mb-2">
                            <option value="">Nessuna sottocategoria</option>
                            {editForm.category && taxonomy.categories.find(c => c.name === editForm.category)?.subcategories.map(s => <option key={s.name}>{s.name}</option>)}
                        </select>
                        <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Descrizione" className="w-full border p-2 rounded mb-2 h-24" />
                        <button onClick={handleSaveEdit} className="w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-2">
                            <Check size={16} /> Salva
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}