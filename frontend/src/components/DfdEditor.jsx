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

    useEffect(() => {
        fetchFlows();
        fetch('/api/dfd-taxonomy')
            .then(res => res.json())
            .then(setDfdTaxonomy)
            .catch(() => setDfdTaxonomy({ categories: [] }));
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

    const sanitizeLabel = (label) => label.replace(/[^\w\s\-\.]/g, '').trim();

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

    // Genera il codice Mermaid
    useEffect(() => {
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
                    setMermaidError('Errore di sintassi Mermaid. Controlla il codice.');
                }
            }
        };
        render();
    }, [mermaidCode]);

    const handleAddFlow = async () => {
        if (!selectedFromId || !selectedToId || !newFlowLabel.trim()) return alert('Completa tutti i campi');
        setLoading(true);
        try {
            await addFlow({ fromId: selectedFromId, toId: selectedToId, label: newFlowLabel });
            setSelectedFromId('');
            setSelectedToId('');
            setNewFlowLabel('');
        } catch (err) { alert('Errore aggiunta flusso'); }
        setLoading(false);
    };

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
        if (window.confirm('Eliminare questo flusso?')) await deleteFlow(id);
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(editableCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCodeChange = (e) => {
        const newCode = e.target.value;
        setEditableCode(newCode);
        setMermaidCode(newCode);
    };

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Fase 3: Data Flow Diagram (DFD) Base</h2>

            {/* Diagramma */}
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[300px] mb-6">
                {mermaidError && <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{mermaidError}</div>}
                <div className="mermaid">{mermaidCode}</div>
            </div>

            {/* Pannello aggiungi flusso */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium flex items-center gap-2 mb-3"><Link size={18} /> Aggiungi flusso</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={selectedFromId} onChange={e => setSelectedFromId(e.target.value)} className="p-2 border rounded bg-white">
                        <option value="">Origine</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={selectedToId} onChange={e => setSelectedToId(e.target.value)} className="p-2 border rounded bg-white">
                        <option value="">Destinazione</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input value={newFlowLabel} onChange={e => setNewFlowLabel(e.target.value)} placeholder="Etichetta" className="p-2 border rounded" />
                </div>
                <button onClick={handleAddFlow} disabled={loading} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Collega
                </button>
            </div>

            {/* Lista flussi esistenti */}
            <div className="mt-6 mb-6">
                <h3 className="font-medium mb-2">Flussi definiti</h3>
                {flows.length === 0 ? <p className="text-sm text-gray-400">Nessun flusso. Usa il pannello sopra.</p> : (
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-100"><tr><th className="p-2">Da</th><th className="p-2">A</th><th className="p-2">Etichetta</th><th className="p-2">Azioni</th></tr></thead>
                        <tbody>
                            {flows.map(flow => {
                                const from = assets.find(a => a.id === flow.fromId);
                                const to = assets.find(a => a.id === flow.toId);
                                return (
                                    <tr key={flow.id} className="border-b">
                                        <td className="p-2">{from?.name || '?'}</td>
                                        <td className="p-2">{to?.name || '?'}</td>
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
                    <label className="text-sm font-medium">Codice Mermaid (modificabile)</label>
                    <button onClick={copyToClipboard} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {copied ? <Check size={14} /> : <Copy size={14} />} Copia
                    </button>
                </div>
                <textarea value={editableCode} onChange={handleCodeChange} rows={12} className="w-full p-3 border rounded font-mono text-sm" />
            </div>

            {/* Dialog modifica etichetta */}
            {showFlowDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between"><h3 className="text-lg font-bold">Modifica etichetta</h3><button onClick={() => setShowFlowDialog(false)}><X size={20} /></button></div>
                        <input value={flowLabel} onChange={e => setFlowLabel(e.target.value)} className="w-full border p-2 rounded my-4" />
                        <button onClick={handleUpdateFlow} className="w-full bg-green-600 text-white p-2 rounded">Salva</button>
                    </div>
                </div>
            )}
        </div>
    );
}