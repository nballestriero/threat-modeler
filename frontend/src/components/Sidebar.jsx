/**
 * Barra laterale di navigazione tra le fasi dell'applicazione
 * @module components/Sidebar
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore';

const phases = [
    { id: 1, name: 'Documenti', icon: '📄' },
    { id: 2, name: 'Asset Base', icon: '🏷️' },
    { id: 3, name: 'DFD', icon: '🔀' },
    { id: 4, name: 'Metodologie', icon: '🧠' },
    { id: 5, name: 'Vista DFD Metodologia', icon: '📊' }
];

export default function Sidebar() {
    const { currentPhase, setPhase } = useAppStore();

    return (
        <aside className="w-64 bg-white shadow-md flex flex-col">
            <div className="p-4 border-b">
                <h1 className="text-xl font-bold text-gray-800">Threat Modeler</h1>
                <p className="text-xs text-gray-500">AI-assisted threat modeling</p>
            </div>
            <nav className="flex-1 p-2">
                {phases.map(phase => (
                    <button
                        key={phase.id}
                        onClick={() => setPhase(phase.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 transition-colors ${currentPhase === phase.id
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                    >
                        <span className="text-xl">{phase.icon}</span>
                        <span className="text-sm">{phase.name}</span>
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t text-xs text-gray-400">
                <p>Pipeline LLM • RAG • DFD</p>
            </div>
        </aside>
    );
}