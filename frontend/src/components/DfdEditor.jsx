/**
 * @file DfdEditor - Fase 3: Data Flow Diagram (DFD) Base
 * @module components/DfdEditor
 * 
 * @description
 * Componente interattivo per visualizzare, creare e modificare il Data Flow Diagram (DFD)
 * di un sistema software. Genera automaticamente diagrammi Mermaid partendo da asset e flussi,
 * applica le regole di validazione DFD Base, gestisce flussi orfani e permette editing manuale del codice.
 * 
 * ## Funzionalità principali
 * - **Visualizzazione DFD**: diagramma Mermaid con subgraph colorati per categoria.
 * - **Validazione DFD**: impedisce collegamenti non consentiti (es. EE → EE, Data Store → EE).
 * - **Gestione flussi orfani**: evidenzia flussi con asset eliminati e permette la rimozione.
 * - **CRUD flussi**: aggiunta, modifica etichetta ed eliminazione con feedback immediato.
 * - **Editor codice**: textarea modificabile con copia, download .mmd e applica modifiche manuali.
 * 
 * ## Dipendenze
 * - `useThreatModelStore` (Zustand): stato asset/flussi + azioni CRUD
 * - `mermaid`: rendering diagrammi
 * - `lucide-react`: icone UI
 * - `taxonomyApi`: recupero tassonomia DFD per stili categorie
 * 
 * @see {@link https://mermaid.js.org/} Documentazione Mermaid
 * @see {@link ../store/useThreatModelStore.js} Store monolitico per asset+flows
 * @see {@link ../api/taxonomyApi.js} Layer API per tassonomie
 */

import React, { useEffect, useState } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import { useShallow } from 'zustand/shallow';
import { taxonomyApi } from '../api/taxonomyApi';
import mermaid from 'mermaid';
import { Plus, Trash, Edit, Save, X, Loader2, Copy, Check, AlertCircle, Link, Download, RefreshCw, AlertTriangle } from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

/**
 * Verifica se un flusso è orfano (collega asset inesistenti).
 * @param {Object} flow - Oggetto flusso con fromId e toId
 * @param {Array} assets - Array asset correnti nello store
 * @returns {boolean} True se il flusso è orfano
 */
const isOrphanFlow = (flow, assets) => {
    return !assets.some(a => a.id === flow.fromId) ||
        !assets.some(a => a.id === flow.toId);
};

/**
 * Componente editor DFD con visualizzazione Mermaid e manipolazione flussi.
 * @returns {JSX.Element} Interfaccia DFD interattiva
 */
export default function DfdEditor() {
    // ========================================================================
    // ⚠️ Selector stabili con useShallow per prevenire infinite re-render
    // ========================================================================
    const {
        assets,
        flows,
        fetchAssets,
        fetchFlows,
        addFlow,
        updateFlow,
        deleteFlow,
        resetLoadedFlags
    } = useThreatModelStore(
        useShallow(state => ({
            assets: state.assets,
            flows: state.flows,
            fetchAssets: state.fetchAssets,
            fetchFlows: state.fetchFlows,
            addFlow: state.addFlow,
            updateFlow: state.updateFlow,
            deleteFlow: state.deleteFlow,
            resetLoadedFlags: state.resetLoadedFlags
        }))
    );

    // Stato per codice Mermaid (automatico vs manuale)
    const [mermaidCode, setMermaidCode] = useState('');
    const [editableCode, setEditableCode] = useState('');

    // Stato UI
    const [copied, setCopied] = useState(false);
    const [showFlowDialog, setShowFlowDialog] = useState(false);
    const [flowLabel, setFlowLabel] = useState('');
    const [editFlow, setEditFlow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mermaidError, setMermaidError] = useState('');

    // Stato form aggiunta flusso
    const [selectedFromId, setSelectedFromId] = useState('');
    const [selectedToId, setSelectedToId] = useState('');
    const [newFlowLabel, setNewFlowLabel] = useState('');

    // Tassonomia DFD per stili categorie
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    /**
     * Effetto di inizializzazione: carica la tassonomia DFD dal backend.
     * Eseguito solo al mount del componente.
     */
    useEffect(() => {
        taxonomyApi.getDfdTaxonomy()
            .then(setDfdTaxonomy)
            .catch(() => setDfdTaxonomy({ categories: [] }));
    }, []);

    /**
     * Sanitizza una stringa per sintassi Mermaid.
     * @param {string} str - Stringa da sanitizzare
     * @returns {string} Stringa sicura per Mermaid
     */
    const sanitizeForMermaid = (str) => {
        if (!str) return '';
        return str
            .replace(/[—–]/g, '-')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[()[\]]/g, ' ')
            .replace(/[^\w\s\-\.\,\/]/g, ' ')
            .trim();
    };

    /**
     * Sanitizza un'etichetta per flussi Mermaid.
     * @param {string} label - Etichetta del flusso
     * @returns {string} Etichetta sicura
     */
    const sanitizeLabel = (label) => label.replace(/[^\w\s\-\.\,\/]/g, '').trim();

    /**
     * Mappa una categoria personalizzata al tipo base DFD.
     * @param {string} category - Categoria dell'asset
     * @returns {string} Tipo base: 'External Entity', 'Process', o 'Data Store'
     */
    const mapToBaseType = (category) => {
        const mapping = {
            'External Entity': 'External Entity',
            'Process': 'Process',
            'Data Store': 'Data Store',
            'Actors': 'External Entity',
            'Processes': 'Process',
            'Models': 'Process',
            'Tools': 'Process',
            'Data': 'Data Store',
            'Infrastructure': 'Data Store',
            'Artefacts': 'Data Store'
        };
        return mapping[category] || 'Process';
    };

    /** Definisce la forma Mermaid per ogni tipo base di asset. */
    const shapeForType = {
        'External Entity': '(["{name}"])',
        'Process': '["{name}"]',
        'Data Store': '[({name})]'
    };

    /**
     * Genera il codice Mermaid automatico partendo da assets, flows e tassonomia.
     * I flussi orfani sono stilizzati con linea tratteggiata e etichetta di warning.
     */
    const generateMermaidCode = () => {
        setMermaidError('');

        if (!assets.length) {
            const code = 'flowchart TD\n    A[Nessun asset. Torna alla fase 2 per aggiungerne.]';
            setMermaidCode(code);
            setEditableCode(code);
            return;
        }

        try {
            const groups = new Map();
            for (const asset of assets) {
                const baseType = mapToBaseType(asset.category);
                const shape = shapeForType[baseType];
                const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
                const rawName = sanitizeForMermaid(asset.name);
                const safeName = rawName.replace(/"/g, '&quot;');
                const nodeDef = shape.replace('{name}', safeName);

                if (!groups.has(baseType)) groups.set(baseType, []);
                groups.get(baseType).push(`    ${safeId}${nodeDef}`);
            }

            let code = 'flowchart TD\n';

            for (const [baseType, nodeList] of groups.entries()) {
                const subgraphId = baseType.replace(/\s/g, '_');
                const catStyle = dfdTaxonomy?.categories?.find(c => c.name === baseType);
                const bg = catStyle?.colorBg || '#f3f4f6';
                const border = catStyle?.color || '#6b7280';

                code += `    subgraph ${subgraphId} ["${baseType}"]\n`;
                code += `        style ${subgraphId} fill:${bg},stroke:${border},stroke-width:2px\n`;
                code += nodeList.join('\n');
                code += `\n    end\n`;
            }

            if (flows.length) {
                code += `\n    %% Flussi\n`;
                flows.forEach((flow, index) => {
                    const fromId = flow.fromId.replace(/[^a-zA-Z0-9]/g, '_');
                    const toId = flow.toId.replace(/[^a-zA-Z0-9]/g, '_');
                    const safeLabel = sanitizeLabel(flow.label);
                    const orphan = isOrphanFlow(flow, assets);

                    if (orphan) {
                        code += `    ${fromId} -.->|"⚠️ ${safeLabel || 'Collegamento interrotto'}"| ${toId}\n`;
                        code += `    linkStyle ${index} stroke:#ef4444,stroke-width:2px,stroke-dasharray:5 5;\n`;
                    } else {
                        code += `    ${fromId} -->|"${safeLabel}"| ${toId}\n`;
                    }
                });
            }

            setMermaidCode(code);
            setEditableCode(code);
        } catch (err) {
            console.error('Errore generazione Mermaid:', err);
            setMermaidError('Errore interno durante la generazione del diagramma.');
        }
    };

    /** Rigenera il codice Mermaid quando assets, flows o tassonomia cambiano. */
    useEffect(() => {
        generateMermaidCode();
    }, [assets, flows, dfdTaxonomy]);

    /** Renderizza il diagramma Mermaid nel DOM. */
    const renderDiagram = async (codeToRender = mermaidCode) => {
        const element = document.querySelector('.mermaid');
        if (!element) return;
        element.removeAttribute('data-processed');
        try {
            await mermaid.run({ nodes: [element], suppressErrors: true });
            setMermaidError('');
        } catch (err) {
            console.error('Mermaid render error:', err);
            setMermaidError('Errore di sintassi Mermaid. Controlla il codice.');
        }
    };

    /** Effetto per renderizzare il diagramma quando il codice cambia. */
    useEffect(() => {
        if (mermaidCode) renderDiagram();
    }, [mermaidCode]);

    // ========== GESTIONE FLUSSI ==========

    /**
     * Aggiunge un nuovo flusso dopo validazione campi e regole DFD.
     * Mostra errori specifici dal backend se la validazione fallisce.
     */
    const handleAddFlow = async () => {
        if (!selectedFromId || !selectedToId || !newFlowLabel.trim()) {
            return alert('Completa tutti i campi: origine, destinazione ed etichetta');
        }
        if (selectedFromId === selectedToId) {
            return alert('Origine e destinazione devono essere asset diversi');
        }

        if (dfdTaxonomy?.categories) {
            const fromAsset = assets.find(a => a.id === selectedFromId);
            const toAsset = assets.find(a => a.id === selectedToId);
            if (fromAsset && toAsset) {
                const fromType = mapToBaseType(fromAsset.category);
                const toType = mapToBaseType(toAsset.category);
                if (fromType === 'External Entity' && toType === 'External Entity') {
                    return alert('In DFD Base, due External Entity non possono essere collegati direttamente. Aggiungi un Process intermedio.');
                }
                if ((fromType === 'Data Store' || toType === 'Data Store') &&
                    (fromType !== 'Process' && toType !== 'Process')) {
                    return alert('In DFD Base, un Data Store deve essere collegato a un Process.');
                }
            }
        }

        setLoading(true);
        try {
            await addFlow({ fromId: selectedFromId, toId: selectedToId, label: newFlowLabel });
            setSelectedFromId('');
            setSelectedToId('');
            setNewFlowLabel('');
        } catch (err) {
            console.error('Errore aggiunta flusso:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Errore durante l\'aggiunta del flusso';
            alert(`Impossibile creare flusso: ${errorMsg}`);
        }
        setLoading(false);
    };

    /** Prepara il dialog per modificare l'etichetta di un flusso. */
    const handleEditFlow = (flow) => {
        setEditFlow(flow);
        setFlowLabel(flow.label);
        setShowFlowDialog(true);
    };

    /** Salva le modifiche all'etichetta del flusso. */
    const handleUpdateFlow = async () => {
        if (!editFlow) return;
        setLoading(true);
        await updateFlow(editFlow.id, { label: flowLabel });
        setEditFlow(null);
        setFlowLabel('');
        setShowFlowDialog(false);
        setLoading(false);
    };

    /** Elimina un flusso dopo conferma utente. */
    const handleDeleteFlow = async (id) => {
        if (window.confirm('Eliminare questo flusso? Questa azione non può essere annullata.')) {
            await deleteFlow(id);
        }
    };

    // ========== FUNZIONI EDITOR CODICE ==========

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(editableCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadFile = () => {
        const blob = new Blob([editableCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dfd_diagram.mmd';
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetToAuto = () => {
        setEditableCode(mermaidCode);
        renderDiagram(mermaidCode);
    };

    const applyManualCode = () => {
        setMermaidCode(editableCode);
        renderDiagram(editableCode);
    };

    const handleCodeChange = (e) => setEditableCode(e.target.value);

    /** Forza un refresh dei dati dallo store. */
    const handleRefreshData = async () => {
        setLoading(true);
        resetLoadedFlags();
        await fetchAssets();
        await fetchFlows();
        setLoading(false);
    };

    // ========== RENDER ==========
    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Fase 3: Data Flow Diagram (DFD) Base</h2>
                <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-2 transition"
                    title="Aggiorna i dati dallo store"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Aggiorna
                </button>
            </div>

            {/* DIAGRAMMA MERMAID */}
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[300px] mb-6">
                {mermaidError && (
                    <div className="mb-2 p-2 bg-red-100 text-red-700 rounded flex items-center gap-2">
                        <AlertCircle size={16} />
                        {mermaidError}
                    </div>
                )}
                <div className="mermaid">{mermaidCode}</div>
                {flows.some(f => isOrphanFlow(f, assets)) && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>Le linee tratteggiate rosse indicano collegamenti interrotti (asset eliminati).</span>
                    </div>
                )}
            </div>

            {/* PANNELLO AGGIUNGI FLUSSO */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                    <Link size={18} /> Aggiungi flusso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={selectedFromId}
                        onChange={e => setSelectedFromId(e.target.value)}
                        className="p-2 border rounded bg-white"
                    >
                        <option value="">Origine</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select
                        value={selectedToId}
                        onChange={e => setSelectedToId(e.target.value)}
                        className="p-2 border rounded bg-white"
                    >
                        <option value="">Destinazione</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input
                        value={newFlowLabel}
                        onChange={e => setNewFlowLabel(e.target.value)}
                        placeholder="Etichetta del flusso"
                        className="p-2 border rounded"
                    />
                </div>
                <button
                    onClick={handleAddFlow}
                    disabled={loading}
                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Collega
                </button>
            </div>

            {/* TABELLA FLUSSI ESISTENTI */}
            <div className="mt-6 mb-6">
                <h3 className="font-medium mb-2">Flussi definiti</h3>
                {flows.length === 0 ? (
                    <p className="text-sm text-gray-400">Nessun flusso definito. Usa il pannello sopra per aggiungerne.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left">Da</th>
                                    <th className="p-2 text-left">A</th>
                                    <th className="p-2 text-left">Etichetta</th>
                                    <th className="p-2 text-left">Stato</th>
                                    <th className="p-2 text-left">Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flows.map(flow => {
                                    const from = assets.find(a => a.id === flow.fromId);
                                    const to = assets.find(a => a.id === flow.toId);
                                    const orphan = isOrphanFlow(flow, assets);
                                    return (
                                        <tr key={flow.id} className={`border-b ${orphan ? 'bg-red-50' : ''}`}
                                            title={orphan ? '⚠️ Collegamento interrotto' : ''}>
                                            <td className={`p-2 ${!from ? 'text-red-600 font-medium' : ''}`}>
                                                {from?.name || '❓ Asset eliminato'}
                                            </td>
                                            <td className={`p-2 ${!to ? 'text-red-600 font-medium' : ''}`}>
                                                {to?.name || '❓ Asset eliminato'}
                                            </td>
                                            <td className="p-2">{flow.label}</td>
                                            <td className="p-2">
                                                {orphan ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                                        <AlertTriangle size={12} /> Orfano
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                        Attivo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 flex gap-2">
                                                <button onClick={() => handleEditFlow(flow)} className="text-amber-600 hover:text-amber-800 transition" title="Modifica etichetta">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteFlow(flow.id)} className="text-red-600 hover:text-red-800 transition" title="Elimina flusso">
                                                    <Trash size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* EDITOR CODICE MERMAID */}
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <label className="text-sm font-medium">Codice Mermaid (modificabile)</label>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={resetToAuto} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition" title="Rigenera codice">
                            <RefreshCw size={14} /> Ripristina automatico
                        </button>
                        <button onClick={copyToClipboard} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition" title="Copia">
                            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiato!' : 'Copia'}
                        </button>
                        <button onClick={downloadFile} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition" title="Scarica .mmd">
                            <Download size={14} /> Scarica
                        </button>
                        <button onClick={applyManualCode} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition" title="Applica modifiche manuali">
                            <Save size={14} /> Applica & aggiorna
                        </button>
                    </div>
                </div>
                <textarea
                    value={editableCode}
                    onChange={handleCodeChange}
                    rows={12}
                    className="w-full p-3 border rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Il codice Mermaid apparirà qui..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    Modifica il codice liberamente e usa "Applica & aggiorna" per vedere le modifiche nel diagramma.
                    "Ripristina automatico" rigenera il codice dagli asset e flussi correnti.
                </p>
            </div>

            {/* DIALOG MODIFICA ETICHETTA */}
            {showFlowDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowFlowDialog(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Modifica etichetta flusso</h3>
                            <button onClick={() => setShowFlowDialog(false)} className="text-gray-500 hover:text-gray-700 transition" aria-label="Chiudi">
                                <X size={20} />
                            </button>
                        </div>
                        <input
                            value={flowLabel}
                            onChange={e => setFlowLabel(e.target.value)}
                            className="w-full border p-2 rounded my-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Inserisci la nuova etichetta..."
                            autoFocus
                        />
                        <button onClick={handleUpdateFlow} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded transition">
                            Salva modifiche
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}