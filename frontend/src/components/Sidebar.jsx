import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Upload, Package, Share2, Shield } from 'lucide-react';

const phases = [
    { id: 1, name: '1. Caricamento', icon: Upload, description: 'Carica documenti e analizza (DFD base)' },
    { id: 2, name: '2. Asset Base', icon: Package, description: 'Gestisci asset (External Entity, Process, Data Store)' },
    { id: 3, name: '3. DFD', icon: Share2, description: 'Crea Data Flow Diagram e flussi' },
    { id: 4, name: '4. Asset Avanzati', icon: Shield, description: 'Arricchisci con tassonomia completa (STRIDE-AI)' },
];

export default function Sidebar() {
    const { currentPhase, setCurrentPhase } = useAppStore();

    return (
        <div className="w-64 bg-white border-r shadow-sm flex flex-col h-screen sticky top-0">
            <div className="p-4 border-b">
                <h1 className="font-bold text-lg text-blue-700">🛡️ Threat Modeler</h1>
                <p className="text-xs text-gray-500">Pipeline in 4 fasi</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {phases.map((phase) => (
                    <button
                        key={phase.id}
                        onClick={() => setCurrentPhase(phase.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${currentPhase === phase.id
                                ? 'bg-blue-100 text-blue-700 font-medium border-l-4 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <phase.icon size={20} />
                        <div className="text-left">
                            <div className="text-sm">{phase.name}</div>
                            <div className="text-xs text-gray-400">{phase.description}</div>
                        </div>
                    </button>
                ))}
            </nav>
        </div>
    );
}