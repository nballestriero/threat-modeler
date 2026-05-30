/**
 * Componente principale dell'applicazione
 * Gestisce la navigazione laterale e la visualizzazione delle fasi
 * @module App
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DocumentationManager from './components/DocumentationManager';
import BaseAssetsManager from './components/BaseAssetsManager';
import DfdEditor from './components/DfdEditor';
import MethodologyManager from './components/MethodologyManager';
import MethodologyDfdView from './components/MethodologyDfdView';
import ConfigPanel from './components/ConfigPanel';
import { useAppStore } from './store/useAppStore';

function App() {
    const { currentPhase } = useAppStore();
    const [showConfig, setShowConfig] = useState(false);

    /**
     * Restituisce il componente corrispondente alla fase corrente
     * @returns {JSX.Element}
     */
    const renderPhase = () => {
        switch (currentPhase) {
            case 1: return <DocumentationManager />;
            case 2: return <BaseAssetsManager />;
            case 3: return <DfdEditor />;
            case 4: return <MethodologyManager />;
            case 5: return <MethodologyDfdView />;
            default: return <DocumentationManager />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-end">
                    <button
                        onClick={() => setShowConfig(true)}
                        className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                        aria-label="Apri configurazione"
                    >
                        ⚙️ Configurazione
                    </button>
                </header>
                <main className="flex-1 p-6 overflow-auto">
                    {renderPhase()}
                </main>
            </div>
            {showConfig && <ConfigPanel onClose={() => setShowConfig(false)} />}
        </div>
    );
}

export default App;