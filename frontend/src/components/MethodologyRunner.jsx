import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useThreatModelStore } from '../store/useThreatModelStore';
import { Loader2, Sparkles } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export default function MethodologyRunner() {
    const { assets, advancedAssets, fetchAdvancedAssets } = useThreatModelStore();
    const [methodologies, setMethodologies] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    useEffect(() => {
        fetchAdvancedAssets();
        axios.get(`${API_BASE}/methodologies`).then(res => setMethodologies(res.data));
    }, []);

    // Filtra gli asset avanzati per metodologia selezionata
    const filteredAssets = advancedAssets.filter(a => a.method === selectedMethod);

    const runEnrichment = async () => {
        if (!selectedMethod) return alert('Seleziona una metodologia');
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/methodologies/${selectedMethod}/enrich`, {
                assetIds: assets.map(a => a.id)
            });
            setResults(res.data);
            await fetchAdvancedAssets(); // ricarica la lista globale
            alert(`Arricchimento completato con ${selectedMethod}`);
        } catch (err) {
            alert('Errore durante l\'arricchimento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Fase 4: Threat Modeling con metodologie</h2>
            <div className="flex gap-4 mb-6">
                <select
                    value={selectedMethod}
                    onChange={e => setSelectedMethod(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="">Seleziona metodologia</option>
                    {methodologies.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                    onClick={runEnrichment}
                    disabled={loading || !selectedMethod}
                    className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Arricchisci con metodologia selezionata
                </button>
            </div>

            {selectedMethod && (
                <div>
                    <h3 className="font-medium text-gray-700 mb-2">Asset arricchiti con {selectedMethod}</h3>
                    {filteredAssets.length === 0 ? (
                        <p className="text-gray-400">Nessun asset arricchito. Esegui l'arricchimento.</p>
                    ) : (
                        <table className="w-full border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">Nome</th>
                                    <th className="p-2">Categoria</th>
                                    <th className="p-2">Sottocategoria</th>
                                    <th className="p-2">Descrizione</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssets.map(a => (
                                    <tr key={a.id} className="border-b">
                                        <td className="p-2">{a.name}</td>
                                        <td className="p-2">{a.category}</td>
                                        <td className="p-2">{a.subCategory || '-'}</td>
                                        <td className="p-2">{a.description?.substring(0, 60)}...</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}