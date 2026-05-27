import React, { useEffect, useState } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import mermaid from 'mermaid';
import { Plus, Trash, Edit, Save, X, Loader2, Copy, Check, AlertCircle, Link } from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export default function DfdEditor() {
    const { assets, flows, fetchFlows, addFlow, updateFlow, deleteFlow } = useThreatModelStore();
    const [mermaidCode, setMermaidCode] = useState('');
    const [editableCode, setEditableCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [showFlowDialog, setShowFlowDialog] = useState(false);
    const [flowLabel, setFlowLabel] = useState('');
    const [editFlow, setEditFlow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mermaidError, setMermaidError] = useState('');
    const [selectedFromId, setSelectedFromId] = useState('');
    const [selectedToId, setSelectedToId] = useState('');
    const [newFlowLabel, setNewFlowLabel] = useState('');
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    // Carica la tassonomia DFD (con colori)
    useEffect(() => {
        fetch('/api/dfd-taxonomy')
            .then(res => res.json())
            .then(data => setDfdTaxonomy(data))
            .catch(err => {
                console.error('Errore caricamento tassonomia DFD, uso default', err);
                setDfdTaxonomy({
                    categories: [
                        { name: 'External Entity', color: '#1E40AF', colorBg: '#DBEAFE' },
                        { name: 'Process', color: '#B45309', colorBg: '#FEF3C7' },
                        { name: 'Data Store', color: '#047857', colorBg: '#D1FAE5' }
                    ]
                });
            });
    }, []);

    useEffect(() => {
        fetchFlows();
    }, []);

    // Sanitizza stringhe per Mermaid
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

    const sanitizeLabel = (label) => {
        return label.replace(/[^\w\s\-\.]/g, '').trim();
    };

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

    const shapeForType = {
        'External Entity': '(["{name}"])',
        'Process': '["{name}"]',
        'Data Store': '[({name})]'
    };

    // Genera il codice Mermaid con colori
    useEffect(() => {
        setMermaidError('');
        if (!assets.length) {
            const code = 'flowchart TD\n    A[Nessun asset. Torna alla fase Gestione Asset per aggiungerne.]';
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
                const categoryStyle = dfdTaxonomy?.categories?.find(c => c.name === baseType);
                const bgColor = categoryStyle?.colorBg || '#f3f4f6';
                const borderColor = categoryStyle?.color || '#6b7280';
                code += `    subgraph ${subgraphId} ["${baseType}"]\n`;
                code += nodeList.join('\n');
                code += `\n    end\n`;
                code += `    classDef ${subgraphId} fill:${bgColor},stroke:${borderColor},stroke-width:2px\n`;
                code += `    class ${subgraphId} ${subgraphId}\n`;
            }

            if (flows.length) {
                code += `\n    %% Flussi\n`;
                for (const flow of flows) {
                    const fromId = flow.fromId.replace(/[^a-zA-Z0-9]/g, '_');
                    const toId = flow.toId.replace(/[^a-zA-Z0-9]/g, '_');
                    const safeLabel = sanitizeLabel(flow.label);
                    code += `    ${fromId} -->|"${safeLabel}"| ${toId}\n`;
                }
            }

            setMermaidCode(code);
            setEditableCode(code);
        } catch (err) {
            console.error('Errore generazione Mermaid:', err);
            setMermaidError('Errore interno durante la generazione del diagramma.');
        }
    }, [assets, flows, dfdTaxonomy]);

    // Render mermaid
    useEffect(() => {
        if (!mermaidCode) return;
        const render = async () => {
            const element = document.querySelector('.mermaid');
            if (element) {
                element.removeAttribute('data-processed');
                try {
                    await mermaid.run({ nodes: [element], suppressErrors: true });
                    setMermaidError('');
                } catch (err) {
                    console.error('Mermaid render error:', err);
                    setMermaidError(`Errore di sintassi Mermaid: verifica il codice`);
                }
            }
        };
        render();
    }, [mermaidCode]);

    // Aggiungi flusso dal pannello
    const handleAddFlow = async () => {
        if (!selectedFromId || !selectedToId || !newFlowLabel.trim()) {
            alert('Seleziona origine, destinazione e inserisci un’etichetta');
            return;
        }
        if (selectedFromId === selectedToId) {
            alert('Origine e destinazione non possono essere uguali');
            return;
        }
        setLoading(true);
        try {
            await addFlow({ fromId: selectedFromId, toId: selectedToId, label: newFlowLabel });
            setSelectedFromId('');
            setSelectedToId('');
            setNewFlowLabel('');
        } catch (err) {
            alert('Errore durante l’aggiunta del flusso');
        } finally {
            setLoading(false);
        }
    };

    // Modifica flusso (dialog)
    const handleEditFlow = (flow) => {
        setEditFlow(flow);
        setFlowLabel(flow.label);
        setShowFlowDialog(true);
    };

    const handleUpdateFlow = async () => {
        if (!editFlow) return;
        setLoading(true);
        await updateFlow(editFlow.id, { label: flowLabel });
        setEditFlow(null);
        setFlowLabel('');
        setShowFlowDialog(false);
        setLoading(false);
    };

    const handleDeleteFlow = async (id) => {
        if (window.confirm('Eliminare questo flusso?')) {
            await deleteFlow(id);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(editableCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copia fallita:', err);
        }
    };

    const handleCodeChange = (e) => {
        const newCode = e.target.value;
        setEditableCode(newCode);
        setMermaidCode(newCode);
    };

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">📊 Fase 3: Data Flow Diagram (DFD)</h2>
            </div>

            {/* Diagramma Mermaid */}
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[300px] mb-6">
                {mermaidError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span className="text-sm">{mermaidError}</span>
                    </div>
                )}
                <div className="mermaid">{mermaidCode}</div>
            </div>

            {/* PANNELLO PER AGGIUNGERE FLUSSI */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <Link size={18} /> Aggiungi nuovo flusso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Origine</label>
                        <select
                            value={selectedFromId}
                            onChange={(e) => setSelectedFromId(e.target.value)}
                            className="w-full p-2 border rounded bg-white"
                        >
                            <option value="">Seleziona asset...</option>
                            {assets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Destinazione</label>
                        <select
                            value={selectedToId}
                            onChange={(e) => setSelectedToId(e.target.value)}
                            className="w-full p-2 border rounded bg-white"
                        >
                            <option value="">Seleziona asset...</option>
                            {assets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Etichetta</label>
                        <input
                            type="text"
                            value={newFlowLabel}
                            onChange={(e) => setNewFlowLabel(e.target.value)}
                            placeholder="es. 'invia immagine', 'richiede'"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>
                <button
                    onClick={handleAddFlow}
                    disabled={loading}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Collega
                </button>
            </div>

            {/* Lista flussi esistenti */}
            <div className="mt-6 mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Flussi esistenti</h3>
                {flows.length === 0 ? (
                    <p className="text-sm text-gray-400">Nessun flusso definito. Usa il pannello sopra per crearne uno.</p>
                ) : (
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-100">
                            <tr><th className="p-2">Da</th><th className="p-2">A</th><th className="p-2">Etichetta</th><th className="p-2">Azioni</th></tr>
                        </thead>
                        <tbody>
                            {flows.map(flow => {
                                const fromAsset = assets.find(a => a.id === flow.fromId);
                                const toAsset = assets.find(a => a.id === flow.toId);
                                return (
                                    <tr key={flow.id} className="border-b">
                                        <td className="p-2">{fromAsset?.name || '?'}</td>
                                        <td className="p-2">{toAsset?.name || '?'}</td>
                                        <td className="p-2">{flow.label}</td>
                                        <td className="p-2 flex gap-2">
                                            <button onClick={() => handleEditFlow(flow)} className="text-amber-600"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteFlow(flow.id)} className="text-red-600"><Trash size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Editor codice Mermaid */}
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Codice Mermaid (modificabile manualmente)</label>
                    <button onClick={copyToClipboard} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 rounded">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiato!' : 'Copia'}
                    </button>
                </div>
                <textarea
                    value={editableCode}
                    onChange={handleCodeChange}
                    rows={12}
                    className="w-full p-3 border rounded font-mono text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    spellCheck={false}
                />
            </div>

            {/* Dialog per modificare etichetta flusso */}
            {showFlowDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Modifica etichetta flusso</h3>
                            <button onClick={() => { setShowFlowDialog(false); setEditFlow(null); setFlowLabel(''); }} className="text-gray-400"><X size={20} /></button>
                        </div>
                        <input
                            type="text"
                            value={flowLabel}
                            onChange={e => setFlowLabel(e.target.value)}
                            className="w-full p-2 border rounded mb-4"
                        />
                        <button
                            onClick={handleUpdateFlow}
                            disabled={loading}
                            className="w-full py-2 bg-green-600 text-white rounded flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salva modifiche
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}