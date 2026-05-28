import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export default function MethodologyDfdView() {
    const { activeMethodology } = useAppStore();
    const [mermaidCode, setMermaidCode] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchDfd = async () => {
        if (!activeMethodology) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/methodologies/${activeMethodology}/dfd`);
            setMermaidCode(res.data.mermaid);
            setTimeout(() => {
                const el = document.querySelector('.methodology-dfd .mermaid');
                if (el) {
                    el.removeAttribute('data-processed');
                    mermaid.run({ nodes: [el], suppressErrors: true });
                }
            }, 100);
        } catch (err) {
            console.error('Errore caricamento DFD metodologia:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDfd();
    }, [activeMethodology]);

    if (!activeMethodology) {
        return <div className="bg-white rounded-xl shadow p-6"><p className="text-gray-500">Nessuna metodologia selezionata. Torna alla fase 4 e seleziona una metodologia.</p></div>;
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 methodology-dfd">
            <h2 className="text-xl font-semibold mb-4">DFD per metodologia: {activeMethodology}</h2>
            {loading && <div className="text-center">Caricamento diagramma...</div>}
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[400px]">
                <div className="mermaid">{mermaidCode}</div>
            </div>
            <p className="text-sm text-gray-500 mt-2">I nodi sono gli asset arricchiti con la metodologia {activeMethodology}. I flussi sono quelli definiti nel DFD base.</p>
        </div>
    );
}