/**
 * Gestore degli asset base (metodologia DFD) - Fase 2
 * 
 * @module components/BaseAssetsManager
 * 
 * @description
 * Questo componente gestisce la visualizzazione, creazione, modifica ed eliminazione degli asset base del DFD.
 * Utilizza lo store monolitico `useThreatModelStore` per garantire sincronizzazione con altre fasi (es. Fase 3: DFD).
 * 
 * ## Funzionalità principali
 * - **Creazione manuale**: form modale con nome, categoria (dropdown colorato per tassonomia) e descrizione
 * - **Visualizzazione tabellare**: asset con badge categoria colorati
 * - **Modifica manuale**: modale con campi precompilati e stile tassonomia
 * - **Eliminazione**: conferma e aggiornamento atomico store
 * - **Dettagli estesi**: chunk di provenienza RAG
 * - **Miglioramento AI**: endpoint `/assets/:id/suggest`
 * 
 * ## Dipendenze
 * - `useThreatModelStore` (Zustand): store monolitico per asset e flussi
 * - `taxonomyApi`: fornisce la tassonomia DFD (categorie, colori)
 * 
 * ## Flusso dati
 * 1. `<AppInitializer />` carica asset/flusso all'avvio
 * 2. Questo componente legge dallo store tramite selector stabili
 * 3. CRUD aggiornano lo store → `DfdEditor` e altri componenti reagiscono automaticamente
 * 
 * @see {@link ../store/useThreatModelStore.js} Store monolitico
 */

import React, { useState, useEffect } from 'react';
import { Pencil, Trash, Eye, X, Check, Loader2, Sparkles, Plus } from 'lucide-react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import { taxonomyApi } from '../api/taxonomyApi';

/**
 * Componente per la gestione degli asset base (Fase 2: DFD).
 * @returns {JSX.Element} Interfaccia di gestione asset
 */
export default function BaseAssetsManager() {
    // ========================================================================
    // ⚠️ IMPORTANTE: Selector stabili per prevenire infinite re-render
    // ========================================================================
    /** @type {Array<{id: string, name: string, category: string, description?: string, evidence?: any}>} */
    const assets = useThreatModelStore((state) => state.assets);

    /** @type {boolean} */
    const loading = useThreatModelStore((state) => state.loading);

    /** @type {() => Promise<void>} */
    const fetchAssets = useThreatModelStore((state) => state.fetchAssets);

    /** @type {(id: string, updates: any) => Promise<void>} */
    const updateAsset = useThreatModelStore((state) => state.updateAsset);

    /** @type {(id: string) => Promise<void>} */
    const deleteAsset = useThreatModelStore((state) => state.deleteAsset);

    /** @type {(data: any) => Promise<void>} */
    const addAsset = useThreatModelStore((state) => state.addAsset);

    // ========================================================================
    // Stato locale per modali e form
    // ========================================================================
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);

    const [editForm, setEditForm] = useState({ name: '', category: '', description: '' });
    const [newAssetForm, setNewAssetForm] = useState({ name: '', category: '', description: '' });
    const [suggestion, setSuggestion] = useState(null);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

    // Tassonomia DFD per stili categorie
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    /**
     * Effetto di inizializzazione: carica la tassonomia DFD dal backend.
     */
    useEffect(() => {
        taxonomyApi.getDfdTaxonomy()
            .then(res => {
                if (res?.categories) setDfdTaxonomy(res);
                else if (Array.isArray(res)) setDfdTaxonomy({ categories: res });
            })
            .catch((err) => {
                console.warn('Fallback tassonomia DFD:', err);
                setDfdTaxonomy({
                    categories: [
                        { name: 'External Entity', color: '#1E40AF', colorBg: '#DBEAFE' },
                        { name: 'Process', color: '#B45309', colorBg: '#FEF3C7' },
                        { name: 'Data Store', color: '#047857', colorBg: '#D1FAE5' }
                    ]
                });
            });
    }, []);

    /**
     * Restituisce lo stile (colori) per una categoria DFD dalla tassonomia.
     * @param {string} catName - Nome della categoria
     * @returns {{ bg: string, text: string }} Oggetto con colori di sfondo e testo
     */
    const getCategoryStyle = (catName) => {
        const cat = dfdTaxonomy?.categories?.find(c => c.name === catName);
        return cat ? { bg: cat.colorBg, text: cat.color } : { bg: '#f3f4f6', text: '#1f2937' };
    };

    // ========== HANDLER AGGIUNTA ASSET ==========

    /**
     * Apre il modale di creazione resetando il form.
     */
    const openAddModal = () => {
        setNewAssetForm({
            name: '',
            category: dfdTaxonomy?.categories?.[0]?.name || '',
            description: ''
        });
        setShowAddModal(true);
    };

    /**
     * Salva il nuovo asset tramite API e aggiorna lo store.
     */
    const handleAddAsset = async () => {
        if (!newAssetForm.name.trim() || !newAssetForm.category) {
            return alert('Nome e Tipo DFD sono obbligatori.');
        }
        try {
            await addAsset(newAssetForm);
            setShowAddModal(false);
        } catch (err) {
            console.error('Errore aggiunta asset:', err);
            alert('Impossibile aggiungere l\'asset: ' + err.message);
        }
    };

    // ========== HANDLER ESISTENTI ==========

    const handleEdit = (asset) => {
        setSelectedAsset(asset);
        setEditForm({ name: asset.name, category: asset.category, description: asset.description || '' });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        try {
            await updateAsset(selectedAsset.id, editForm);
            setShowEditModal(false);
        } catch (err) {
            console.error('Errore salvataggio asset:', err);
            alert('Impossibile salvare le modifiche: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Eliminare questo asset base? I flussi collegati diventeranno orfani.')) {
            try {
                await deleteAsset(id);
            } catch (err) {
                console.error('Errore eliminazione asset:', err);
                alert('Impossibile eliminare l\'asset: ' + err.message);
            }
        }
    };

    const handleSuggest = async (asset) => {
        setSelectedAsset(asset);
        setIsLoadingSuggestion(true);
        setShowSuggestionModal(true);
        setSuggestion(null);
        try {
            const res = await fetch(`/api/assets/${asset.id}/suggest`, { method: 'POST' });
            if (!res.ok) throw new Error('Errore server');
            const data = await res.json();
            setSuggestion(data);
        } catch (err) {
            console.error('Errore suggerimento AI:', err);
            alert('Errore nel generare suggerimenti: ' + err.message);
            setShowSuggestionModal(false);
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    const applySuggestion = async () => {
        if (!selectedAsset || !suggestion) return;
        try {
            await updateAsset(selectedAsset.id, {
                name: suggestion.name,
                category: suggestion.category,
                description: suggestion.description
            });
            setShowSuggestionModal(false);
        } catch (err) {
            console.error('Errore applicazione suggerimento:', err);
            alert('Impossibile applicare i suggerimenti: ' + err.message);
        }
    };

    // Loading state
    if (loading && assets.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span>Caricamento asset...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            {/* Header con titolo e bottone aggiunta */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h2 className="text-xl font-semibold">Fase 2: Asset Base (DFD)</h2>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                    <Plus size={16} />
                    Aggiungi Asset Manualmente
                </button>
            </div>

            {/* Tabella asset */}
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
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-4 text-center text-gray-500">
                                    Nessun asset trovato. Aggiungine uno manualmente o torna alla Fase 1 per l'estrazione automatica.
                                </td>
                            </tr>
                        ) : (
                            assets.map(asset => {
                                const style = getCategoryStyle(asset.category);
                                return (
                                    <tr key={asset.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                                        <td className="p-2 font-medium">{asset.name}</td>
                                        <td className="p-2">
                                            <span
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                                style={{ backgroundColor: style.bg, color: style.text }}
                                                title={`Categoria: ${asset.category}`}
                                            >
                                                {asset.category}
                                            </span>
                                        </td>
                                        <td className="p-2 flex gap-1">
                                            <button onClick={() => { setSelectedAsset(asset); setShowDetailModal(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Dettagli"><Eye size={16} /></button>
                                            <button onClick={() => handleEdit(asset)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded transition" title="Modifica"><Pencil size={16} /></button>
                                            <button onClick={() => handleDelete(asset.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition disabled:opacity-50" title="Elimina" disabled={loading}><Trash size={16} /></button>
                                            <button onClick={() => handleSuggest(asset)} className="text-purple-600 hover:bg-purple-50 p-1.5 rounded transition" title="Migliora con AI"><Sparkles size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ========== MODALE DETTAGLI ========== */}
            {showDetailModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)} role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="detail-modal-title" className="text-lg font-bold">Dettagli Asset Base</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 transition p-1" aria-label="Chiudi dettagli"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <p><strong className="text-gray-700">Nome:</strong> {selectedAsset.name}</p>
                            <p><strong className="text-gray-700">Tipo DFD:</strong> <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: getCategoryStyle(selectedAsset.category).bg, color: getCategoryStyle(selectedAsset.category).text }}>{selectedAsset.category}</span></p>
                            <p><strong className="text-gray-700">Descrizione:</strong></p>
                            <p className="text-gray-600 bg-gray-50 p-2 rounded">{selectedAsset.description || 'Nessuna descrizione disponibile.'}</p>
                        </div>
                        <div className="mt-5 pt-4 border-t">
                            <strong className="text-sm text-gray-700">Contesto (chunk di provenienza):</strong>
                            {selectedAsset.evidence?.chunks?.length ? (
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    {selectedAsset.evidence.chunks.map((chunk, idx) => (
                                        <li key={idx} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                            <span className="font-medium text-gray-700">Chunk #{chunk.index || idx + 1}:</span>
                                            <p className="mt-1">{chunk.snippet || 'Testo non disponibile'}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-gray-500 mt-2 italic">Nessun contesto salvato.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODALE MODIFICA ========== */}
            {showEditModal && selectedAsset && dfdTaxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowEditModal(false)} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="edit-modal-title" className="text-lg font-bold">Modifica Asset Base</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 transition p-1" aria-label="Chiudi modifica" disabled={loading}><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={loading} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo DFD *</label>
                                <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={loading} style={{ backgroundColor: getCategoryStyle(editForm.category).bg, color: getCategoryStyle(editForm.category).text }}>
                                    {dfdTaxonomy.categories.map(cat => (
                                        <option key={cat.name} value={cat.name} style={{ backgroundColor: cat.colorBg, color: cat.color }}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full border border-gray-300 p-2 rounded h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={loading} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded flex items-center justify-center gap-2 transition disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} {loading ? 'Salvataggio...' : 'Salva'}
                                </button>
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 p-2.5 rounded transition" disabled={loading}>Annulla</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== MODALE AGGIUNGI ASSET ========== */}
            {showAddModal && dfdTaxonomy && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="add-modal-title" className="text-lg font-bold flex items-center gap-2">
                                <Plus size={18} className="text-blue-600" />
                                Nuovo Asset Base
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 transition p-1" aria-label="Chiudi"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddAsset(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input
                                    value={newAssetForm.name}
                                    onChange={e => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    placeholder="Es. API Gateway, Database Utenti..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo DFD *</label>
                                <select
                                    value={newAssetForm.category}
                                    onChange={e => setNewAssetForm({ ...newAssetForm, category: e.target.value })}
                                    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    style={{ backgroundColor: getCategoryStyle(newAssetForm.category).bg, color: getCategoryStyle(newAssetForm.category).text }}
                                >
                                    {dfdTaxonomy.categories.map(cat => (
                                        <option
                                            key={cat.name}
                                            value={cat.name}
                                            style={{ backgroundColor: cat.colorBg, color: cat.color }}
                                        >
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                                <textarea
                                    value={newAssetForm.description}
                                    onChange={e => setNewAssetForm({ ...newAssetForm, description: e.target.value })}
                                    className="w-full border border-gray-300 p-2 rounded h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    placeholder="Descrivi il ruolo e il contesto dell'asset..."
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded flex items-center justify-center gap-2 transition">
                                    <Plus size={16} /> Crea Asset
                                </button>
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 p-2.5 rounded transition">Annulla</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== MODALE SUGGERIMENTO AI ========== */}
            {showSuggestionModal && selectedAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowSuggestionModal(false)} role="dialog" aria-modal="true" aria-labelledby="suggestion-modal-title">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="suggestion-modal-title" className="text-lg font-bold flex items-center gap-2">
                                <Sparkles size={18} className="text-purple-600" />
                                Miglioramento con AI
                            </h3>
                            <button onClick={() => setShowSuggestionModal(false)} className="text-gray-500 hover:text-gray-700 transition p-1" aria-label="Chiudi"><X size={20} /></button>
                        </div>
                        {isLoadingSuggestion ? (
                            <div className="flex flex-col justify-center items-center py-8 gap-3">
                                <Loader2 className="animate-spin text-purple-600" size={32} />
                                <span className="text-gray-600">Generazione suggerimenti...</span>
                            </div>
                        ) : suggestion ? (
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome suggerito</label><div className="bg-gray-50 border p-3 rounded text-sm">{suggestion.name}</div></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria suggerita</label><div className="bg-gray-50 border p-3 rounded text-sm" style={{ backgroundColor: getCategoryStyle(suggestion.category).bg, color: getCategoryStyle(suggestion.category).text }}>{suggestion.category}</div></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrizione suggerita</label><div className="bg-gray-50 border p-3 rounded text-sm whitespace-pre-wrap">{suggestion.description}</div></div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={applySuggestion} className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded flex items-center justify-center gap-2 transition"><Check size={16} /> Applica</button>
                                    <button onClick={() => setShowSuggestionModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 p-2.5 rounded transition">Annulla</button>
                                </div>
                            </div>
                        ) : <p className="text-gray-500 text-center py-4">Nessun suggerimento disponibile.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}