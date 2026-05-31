/**
 * DfdEditor - Fase 3: Data Flow Diagram (DFD) Base
 * 
 * @module components/DfdEditor
 * 
 * @description
 * Questo componente permette di visualizzare, creare e modificare il Data Flow Diagram (DFD)
 * di un sistema software, partendo dagli asset (nodi) e flussi (archi) definiti nelle fasi precedenti.
 * 
 * ## Funzionalità principali
 * - **Visualizzazione DFD**: diagramma interattivo con Mermaid, nodi raggruppati per categoria in box colorati.
 *   I colori sono presi dalla tassonomia DFD (endpoint `/api/dfd-taxonomy`).
 * - **Gestione flussi orfani**: i flussi che collegano asset eliminati sono visualizzati con linea tratteggiata rossa
 *   e tooltip "⚠️ Collegamento interrotto". Possono essere eliminati manualmente dalla tabella.
 * - **Aggiunta flussi**: pannello con selezione origine/destinazione e campo etichetta.
 * - **Gestione flussi esistenti**: tabella riassuntiva con azioni modifica etichetta ed eliminazione.
 * - **Editor di codice Mermaid**: textarea modificabile; pulsanti per copiare, scaricare (file .mmd), ripristinare automatico e applicare le modifiche manuali.
 * - **Validazione sintassi**: messaggio di errore se il codice Mermaid non è valido.
 * - **Refresh manuale**: pulsante per forzare un re-fetch dei dati dallo store (utile dopo operazioni bulk in Fase 2).
 * 
 * ## Dipendenze
 * - `useThreatModelStore` (Zustand): fornisce `assets`, `flows`, `fetchAssets`, `fetchFlows`, `addFlow`, `updateFlow`, `deleteFlow`, `resetLoadedFlags`.
 * - `mermaid`: libreria per il rendering dei diagrammi.
 * - `lucide-react`: icone.
 * - `taxonomyApi`: layer API centralizzato per recuperare la tassonomia DFD.
 * 
 * ## Flusso dati
 * 1. All'avvio, `<AppInitializer />` (montato in `App.jsx`) carica asset e flussi nello store.
 * 2. Questo componente legge direttamente dallo store: nessun fetch condizionale iniziale.
 * 3. Recupera la tassonomia DFD dal backend tramite `taxonomyApi.getDfdTaxonomy()` (dato esterno, non nello store).
 * 4. Genera automaticamente il codice Mermaid (subgraph per categoria, nodi con forma DFD, archi con etichetta).
 * 5. I flussi orfani (con source/target inesistenti) sono stilizzati con linea tratteggiata rossa.
 * 6. Il rendering avviene tramite `mermaid.run()`.
 * 7. Le operazioni CRUD sui flussi aggiornano lo store → l'`useEffect` reattivo rigenera il diagramma automaticamente.
 * 8. L'utente può modificare manualmente il codice; "Applica & aggiorna" usa il codice manuale per il rendering (senza alterare i dati).
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
 * Verifica se un flusso è orfano, ovvero se il suo source o target non esiste più negli asset.
 * @param {Object} flow - Oggetto flusso con proprietà fromId e toId
 * @param {Array} assets - Array di asset correnti
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
    // ⚠️ IMPORTANTE: Selector stabili con useShallow per prevenire infinite re-render
    // useShallow confronta i valori con shallow equality, evitando re-render se i riferimenti non cambiano
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

    // Stato per il codice Mermaid (automatico e manuale)
    const [mermaidCode, setMermaidCode] = useState('');
    const [editableCode, setEditableCode] = useState('');

    // Stato per UI: clipboard, dialog, loading, errori
    const [copied, setCopied] = useState(false);
    const [showFlowDialog, setShowFlowDialog] = useState(false);
    const [flowLabel, setFlowLabel] = useState('');
    const [editFlow, setEditFlow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mermaidError, setMermaidError] = useState('');

    // Stato per form aggiunta flusso
    const [selectedFromId, setSelectedFromId] = useState('');
    const [selectedToId, setSelectedToId] = useState('');
    const [newFlowLabel, setNewFlowLabel] = useState('');

    // Tassonomia DFD per stili categorie
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    /**
     * Effetto di inizializzazione: carica SOLO la tassonomia DFD dal backend tramite taxonomyApi.
     * Asset e flussi sono già nello store grazie ad AppInitializer.
     * Eseguito solo al mount del componente.
     */
    useEffect(() => {
        taxonomyApi.getDfdTaxonomy()
            .then(setDfdTaxonomy)
            .catch(() => setDfdTaxonomy({ categories: [] }));
    }, []); // Dipendenze vuote: eseguito solo al mount

    /**
     * Sanitizza una stringa per l'uso in sintassi Mermaid.
     * Rimuove caratteri speciali che potrebbero rompere il parsing.
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
     * Sanitizza un'etichetta per flussi Mermaid (versione più restrittiva).
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

    /**
     * Definisce la forma Mermaid per ogni tipo base di asset.
     * {name} viene sostituito con il nome sanitizzato.
     */
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

        // Caso vuoto: nessun asset
        if (!assets.length) {
            const code = 'flowchart TD\n    A[Nessun asset. Torna alla fase 2 per aggiungerne.]';
            setMermaidCode(code);
            setEditableCode(code);
            return;
        }

        try {
            // Raggruppa asset per tipo base per creare subgraph
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

            // Costruisci il codice Mermaid
            let code = 'flowchart TD\n';

            // Aggiungi subgraph per ogni categoria
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

            // Aggiungi flussi
            if (flows.length) {
                code += `\n    %% Flussi\n`;

                flows.forEach((flow, index) => {
                    const fromId = flow.fromId.replace(/[^a-zA-Z0-9]/g, '_');
                    const toId = flow.toId.replace(/[^a-zA-Z0-9]/g, '_');
                    const safeLabel = sanitizeLabel(flow.label);

                    // Verifica se il flusso è orfano
                    const orphan = isOrphanFlow(flow, assets);

                    if (orphan) {
                        // Flusso orfano: linea tratteggiata + etichetta warning
                        code += `    ${fromId} -.->|"⚠️ ${safeLabel || 'Collegamento interrotto'}"| ${toId}\n`;
                        // Applica stile rosso all'arco (indice basato sull'ordine di aggiunta)
                        code += `    linkStyle ${index} stroke:#ef4444,stroke-width:2px,stroke-dasharray:5 5;\n`;
                    } else {
                        // Flusso normale
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

    /**
     * Rigenera il codice Mermaid ogni volta che assets, flows o tassonomia cambiano.
     * Questo è il cuore della reattività: quando lo store si aggiorna (es. dopo delete in Fase 2),
     * il diagramma si rigenera automaticamente senza bisogno di refresh manuale.
     */
    useEffect(() => {
        generateMermaidCode();
    }, [assets, flows, dfdTaxonomy]);

    /**
     * Renderizza il diagramma Mermaid nel DOM.
     * @param {string} codeToRender - Codice Mermaid da renderizzare (default: mermaidCode)
     */
    const renderDiagram = async (codeToRender = mermaidCode) => {
        const element = document.querySelector('.mermaid');
        if (!element) return;

        // Resetta lo stato di processing di Mermaid
        element.removeAttribute('data-processed');

        try {
            await mermaid.run({ nodes: [element], suppressErrors: true });
            setMermaidError('');
        } catch (err) {
            console.error('Mermaid render error:', err);
            setMermaidError('Errore di sintassi Mermaid. Controlla il codice.');
        }
    };

    /**
     * Effetto per renderizzare il diagramma quando il codice Mermaid cambia.
     */
    useEffect(() => {
        if (mermaidCode) renderDiagram();
    }, [mermaidCode]);

    // ========== GESTIONE FLUSSI ==========

    /**
     * Aggiunge un nuovo flusso dopo validazione dei campi.
     */
    const handleAddFlow = async () => {
        if (!selectedFromId || !selectedToId || !newFlowLabel.trim()) {
            return alert('Completa tutti i campi: origine, destinazione ed etichetta');
        }
        setLoading(true);
        try {
            await addFlow({ fromId: selectedFromId, toId: selectedToId, label: newFlowLabel });
            // Reset form
            setSelectedFromId('');
            setSelectedToId('');
            setNewFlowLabel('');
        } catch (err) {
            console.error('Errore aggiunta flusso:', err);
            alert('Errore durante l\'aggiunta del flusso');
        }
        setLoading(false);
    };

    /**
     * Prepara il dialog per modificare l'etichetta di un flusso esistente.
     * @param {Object} flow - Flusso da modificare
     */
    const handleEditFlow = (flow) => {
        setEditFlow(flow);
        setFlowLabel(flow.label);
        setShowFlowDialog(true);
    };

    /**
     * Salva le modifiche all'etichetta del flusso.
     */
    const handleUpdateFlow = async () => {
        if (!editFlow) return;
        setLoading(true);
        await updateFlow(editFlow.id, { label: flowLabel });
        setEditFlow(null);
        setFlowLabel('');
        setShowFlowDialog(false);
        setLoading(false);
    };

    /**
     * Elimina un flusso dopo conferma utente.
     * @param {string} id - ID del flusso da eliminare
     */
    const handleDeleteFlow = async (id) => {
        if (window.confirm('Eliminare questo flusso? Questa azione non può essere annullata.')) {
            await deleteFlow(id);
        }
    };

    // ========== FUNZIONI EDITOR CODICE ==========

    /**
     * Copia il codice Mermaid negli appunti con feedback visivo.
     */
    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(editableCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /**
     * Scarica il codice Mermaid come file .mmd.
     */
    const downloadFile = () => {
        const blob = new Blob([editableCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dfd_diagram.mmd';
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Ripristina l'editor con il codice automatico generato.
     */
    const resetToAuto = () => {
        setEditableCode(mermaidCode);
        renderDiagram(mermaidCode);
    };

    /**
     * Applica il codice manuale modificato dall'utente al rendering.
     */
    const applyManualCode = () => {
        setMermaidCode(editableCode);
        renderDiagram(editableCode);
    };

    /**
     * Gestisce il cambio del codice nell'editor textarea.
     * @param {Event} e - Evento change dell'input
     */
    const handleCodeChange = (e) => {
        setEditableCode(e.target.value);
    };

    /**
     * Forza un refresh dei dati dallo store (utile dopo operazioni bulk in Fase 2).
     * Resetta i flag loaded e triggera un nuovo fetch.
     */
    const handleRefreshData = async () => {
        setLoading(true);
        resetLoadedFlags();
        await fetchAssets();
        await fetchFlows();
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Fase 3: Data Flow Diagram (DFD) Base</h2>
                {/* Pulsante refresh manuale opzionale */}
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

            {/* ========== DIAGRAMMA MERMAID ========== */}
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[300px] mb-6">
                {mermaidError && (
                    <div className="mb-2 p-2 bg-red-100 text-red-700 rounded flex items-center gap-2">
                        <AlertCircle size={16} />
                        {mermaidError}
                    </div>
                )}
                <div className="mermaid">{mermaidCode}</div>

                {/* Legenda flussi orfani */}
                {flows.some(f => isOrphanFlow(f, assets)) && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>Le linee tratteggiate rosse indicano collegamenti interrotti (asset eliminati).</span>
                    </div>
                )}
            </div>

            {/* ========== PANNELLO AGGIUNGI FLUSSO ========== */}
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
                        {assets.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedToId}
                        onChange={e => setSelectedToId(e.target.value)}
                        className="p-2 border rounded bg-white"
                    >
                        <option value="">Destinazione</option>
                        {assets.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
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

            {/* ========== TABELLA FLUSSI ESISTENTI ========== */}
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
                                        <tr
                                            key={flow.id}
                                            className={`border-b ${orphan ? 'bg-red-50' : ''}`}
                                            title={orphan ? '⚠️ Collegamento interrotto: uno o entrambi gli asset collegati sono stati eliminati' : ''}
                                        >
                                            <td className={`p-2 ${!from ? 'text-red-600 font-medium' : ''}`}>
                                                {from?.name || '❓ Asset eliminato'}
                                            </td>
                                            <td className={`p-2 ${!to ? 'text-red-600 font-medium' : ''}`}>
                                                {to?.name || '❓ Asset eliminato'}
                                            </td>
                                            <td className="p-2">{flow.label}</td>
                                            <td className="p-2">
                                                {orphan && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                                        <AlertTriangle size={12} />
                                                        Orfano
                                                    </span>
                                                )}
                                                {!orphan && (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                        Attivo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 flex gap-2">
                                                <button
                                                    onClick={() => handleEditFlow(flow)}
                                                    className="text-amber-600 hover:text-amber-800 transition"
                                                    title="Modifica etichetta"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFlow(flow.id)}
                                                    className="text-red-600 hover:text-red-800 transition"
                                                    title="Elimina flusso"
                                                >
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

            {/* ========== EDITOR CODICE MERMAID ========== */}
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <label className="text-sm font-medium">Codice Mermaid (modificabile)</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={resetToAuto}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition"
                            title="Rigenera codice dagli asset e flussi correnti"
                        >
                            <RefreshCw size={14} /> Ripristina automatico
                        </button>
                        <button
                            onClick={copyToClipboard}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition"
                            title="Copia negli appunti"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copiato!' : 'Copia'}
                        </button>
                        <button
                            onClick={downloadFile}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1 transition"
                            title="Scarica come file .mmd"
                        >
                            <Download size={14} /> Scarica
                        </button>
                        <button
                            onClick={applyManualCode}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition"
                            title="Applica le modifiche manuali al diagramma"
                        >
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

            {/* ========== DIALOG MODIFICA ETICHETTA ========== */}
            {showFlowDialog && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowFlowDialog(false)}
                >
                    <div
                        className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Modifica etichetta flusso</h3>
                            <button
                                onClick={() => setShowFlowDialog(false)}
                                className="text-gray-500 hover:text-gray-700 transition"
                                aria-label="Chiudi"
                            >
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
                        <button
                            onClick={handleUpdateFlow}
                            className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded transition"
                        >
                            Salva modifiche
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}