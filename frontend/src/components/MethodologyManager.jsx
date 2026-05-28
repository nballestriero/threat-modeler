import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MethodologyView from './MethodologyView';
import { useAppStore } from '../store/useAppStore';

export default function MethodologyManager() {
    const { setActiveMethodology } = useAppStore();
    const [methodologies, setMethodologies] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState(null);

    useEffect(() => {
        axios.get('/api/methodologies').then(res => setMethodologies(res.data));
    }, []);

    const handleSelectMethod = (method) => {
        setSelectedMethod(method);
        setActiveMethodology(method);
    };

    if (!selectedMethod) {
        return (
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Fase 4: Scegli metodologia di threat modeling</h2>
                <div className="flex flex-wrap gap-4">
                    {methodologies.map(m => (
                        <button
                            key={m}
                            onClick={() => handleSelectMethod(m)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <button onClick={() => { setSelectedMethod(null); setActiveMethodology(null); }} className="mb-4 text-blue-600 hover:underline">
                ← Torna alla selezione metodologie
            </button>
            <MethodologyView method={selectedMethod} />
        </div>
    );
}