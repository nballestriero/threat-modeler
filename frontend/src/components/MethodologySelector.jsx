import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import MethodologyView from './MethodologyView';

export default function MethodologySelector() {
    const [methodologies, setMethodologies] = useState([]);
    const { activeMethodology, setActiveMethodology, setCurrentPhase } = useAppStore();

    useEffect(() => {
        axios.get('/api/methodologies').then(res => setMethodologies(res.data));
    }, []);

    const handleSelect = (method) => {
        setActiveMethodology(method);
        // Opzionale: passa direttamente alla fase 5 (DFD metodologia)
        setCurrentPhase(5);
    };

    if (!activeMethodology) {
        return (
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Fase 4: Seleziona una metodologia</h2>
                <div className="flex flex-wrap gap-4">
                    {methodologies.map(m => (
                        <button
                            key={m}
                            onClick={() => handleSelect(m)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Se metodologia attiva, mostriamo il pannello di gestione (tabella, arricchimento, DFD)
    // ma per separare la fase 5, qui mostriamo solo la gestione asset (senza DFD)
    // Il DFD lo mostreremo nella fase 5.
    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Metodologia attiva: {activeMethodology}</h2>
                <button onClick={() => setActiveMethodology(null)} className="text-red-600">Cambia metodologia</button>
            </div>
            <MethodologyView method={activeMethodology} showDfd={false} />
        </div>
    );
}