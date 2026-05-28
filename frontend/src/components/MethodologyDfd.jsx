import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export default function MethodologyDfd() {
    const { activeMethodology } = useAppStore();
    const [mermaidCode, setMermaidCode] = useState('');

    useEffect(() => {
        if (!activeMethodology) return;
        const fetchDfd = async () => {
            const res = await axios.get(`/api/methodologies/${activeMethodology}/dfd`);
            setMermaidCode(res.data.mermaid);
            setTimeout(() => {
                const el = document.querySelector('.mermaid');
                if (el) {
                    el.removeAttribute('data-processed');
                    mermaid.run({ nodes: [el], suppressErrors: true });
                }
            }, 100);
        };
        fetchDfd();
    }, [activeMethodology]);

    if (!activeMethodology) return <div>Nessuna metodologia selezionata. Torna alla fase 4.</div>;

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">DFD per metodologia: {activeMethodology}</h2>
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[400px]">
                <div className="mermaid">{mermaidCode}</div>
            </div>
        </div>
    );
}