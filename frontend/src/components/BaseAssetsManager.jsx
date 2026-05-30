/**
 * Gestore degli asset base (metodologia DFD)
 * 
 * ⚙️ **Dipendenze**:
 * - `useAssetStore`: store Zustand per CRUD asset (fetch, update, delete)
 * - `taxonomyApi`: fornisce la tassonomia DFD (categorie, colori)
 * - `apiClient`: per chiamate API personalizzate (es. endpoint /suggest)
 * 
 * 🎯 **Funzionalità**:
 * - Visualizzazione tabellare degli asset (nome, categoria con badge colorato)
 * - Modifica manuale (pulsante matita) → modale con campi nome, categoria (select con sfondo colorato), descrizione
 * - Eliminazione (cestino) con conferma
 * - Dettagli estesi (occhio) → mostra anche i chunk di provenienza (evidence)
 * - Miglioramento con AI (stella viola) → chiamata POST /assets/:id/suggest, mostra suggerimenti in modale, applicazione opzionale
 * 
 * 🧠 **Stato**:
 * - Usa `useAssetStore` per `assets`, `isLoading`, `isUpdating`, `updateAsset`, `deleteAsset`, `fetchAssets`
 * - Stato locale per modali, form, suggerimenti
 * 
 * 🎨 **Stili**:
 * - I badge e il select delle categorie usano i colori definiti nella tassonomia (colorBg, color)
 * 
 * @module components/BaseAssetsManager
 */


import React, { useState, useEffect } from 'react';
import { Pencil, Trash, Eye, X, Check, Loader2, Sparkles } from 'lucide-react';
import { useAssetStore } from '../store/useAssetStore';
import { taxonomyApi } from '../api/taxonomyApi';
import { apiClient } from '../config/api';

export default function BaseAssetsManager() {
    const { assets, isLoading, isUpdating, fetchAssets, updateAsset, deleteAsset } = useAssetStore();
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', category: '', description: '' });
    const [suggestion, setSuggestion] = useState(null);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    useEffect(() => {
        fetchAssets();
        taxonomyApi.getDfdTaxonomy()
            .then(res => {
                // La risposta potrebbe essere { categories: [...] } o direttamente l'array
                if (res.categories) setDfdTaxonomy(res);
                else setDfdTaxonomy({ categories: res });
            })
            .catch(() => setDfdTaxonomy({
                categories: [
                    { name: 'External Entity', color: '#1E40AF', colorBg: '#DBEAFE' },
                    { name: 'Process', color: '#B45309', colorBg: '#FEF3C7' },
                    { name: 'Data Store', color: '#047857', colorBg: '#D1FAE5' }
                ]
            }));
    }, [fetchAssets]);

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
        await updateAsset(selectedAsset.id, editForm);
        setShowEditModal(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare questo asset base?')) await deleteAsset(id);
    };

    const handleSuggest = async (asset) => {
        setSelectedAsset(asset);
        setIsLoadingSuggestion(true);
        setShowSuggestionModal(true);
        setSuggestion(null);
        try {
            const res = await apiClient.post(`/assets/${asset.id}/suggest`);
            setSuggestion(res.data);
        } catch (err) {
            alert('Errore nel generare suggerimenti: ' + err.message);
            setShowSuggestionModal(false);
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    if (isLoading) return <div className="p-4 text-center text-gray-500">Caricamento asset...</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Fase 2: Asset Base (DFD)</h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left">Nome</th>
                            <th className="p-2 text-left">Tipo DFD</th>
                            <th className="p-2 text-left">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => {
                            const style = getCategoryStyle(asset.category);
                            return (
                                <tr key={asset.id} className="border-b border-gray-200 hover:bg-gray-50">
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
                                        <button
                                            onClick={() => { setSelectedAsset(asset); setShowDetailModal(true); }}
                                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                            aria-label="Dettagli"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(asset)}
                                            className="text-amber-600 hover:bg-amber-50 p-1 rounded"
                                            aria-label="Modifica"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(asset.id)}
                                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                                            aria-label="Elimina"
                                            disabled={isUpdating}
                                        >
                                            <Trash size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleSuggest(asset)}
                                            className="text-purple-600 hover:bg-purple-50 p-1 rounded"
                                            aria-label="Migliora con AI"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modale dettagli */}
            {showDetailModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Dettagli Asset Base</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <p><strong>Nome:</strong> {selectedAsset.name}</p>
                        <p><strong>Tipo DFD:</strong> {selectedAsset.category}</p>
                        <p><strong>Descrizione:</strong> {selectedAsset.description || 'Nessuna descrizione.'}</p>
                        <div className="mt-4">
                            <strong>Contesto (chunk di provenienza):</strong>
                            {selectedAsset.evidence?.chunks?.length ? (
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    {selectedAsset.evidence.chunks.map((chunk, idx) => (
                                        <li key={idx} className="text-sm text-gray-600">
                                            {chunk.snippet || `Chunk ${chunk.index} (testo non disponibile)`}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 mt-2">Nessun contesto salvato per questo asset.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modale modifica manuale */}
            {showEditModal && selectedAsset && dfdTaxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Modifica Asset Base</h3>
                        <input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                            placeholder="Nome"
                            disabled={isUpdating}
                        />
                        <select
                            value={editForm.category}
                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full border p-2 rounded mb-2"
                            disabled={isUpdating}
                            style={{ backgroundColor: getCategoryStyle(editForm.category).bg, color: getCategoryStyle(editForm.category).text }}
                        >
                            {dfdTaxonomy.categories.map(cat => (
                                <option key={cat.name} value={cat.name} style={{ backgroundColor: cat.colorBg, color: cat.color }}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <textarea
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full border p-2 rounded mb-2 h-24"
                            placeholder="Descrizione"
                            disabled={isUpdating}
                        />
                        <button
                            onClick={handleSaveEdit}
                            disabled={isUpdating}
                            className="w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            {isUpdating ? 'Salvataggio...' : 'Salva'}
                        </button>
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="mt-2 w-full bg-gray-300 p-2 rounded"
                            disabled={isUpdating}
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Modale suggerimento AI */}
            {showSuggestionModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowSuggestionModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Miglioramento con AI</h3>
                        {isLoadingSuggestion ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="animate-spin" size={32} />
                                <span className="ml-2">Generazione suggerimenti...</span>
                            </div>
                        ) : suggestion ? (
                            <>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium">Nome suggerito</label>
                                    <div className="bg-gray-100 p-2 rounded">{suggestion.name}</div>
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium">Categoria suggerita</label>
                                    <div className="bg-gray-100 p-2 rounded" style={{ backgroundColor: getCategoryStyle(suggestion.category).bg, color: getCategoryStyle(suggestion.category).text }}>
                                        {suggestion.category}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium">Descrizione suggerita</label>
                                    <div className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{suggestion.description}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={applySuggestion}
                                        className="flex-1 bg-green-600 text-white p-2 rounded flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} /> Applica
                                    </button>
                                    <button
                                        onClick={() => setShowSuggestionModal(false)}
                                        className="flex-1 bg-gray-300 p-2 rounded"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}