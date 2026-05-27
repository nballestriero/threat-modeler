import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DocumentationManager from './components/DocumentationManager';
import AssetInventory from './components/AssetInventory';
import DfdEditor from './components/DfdEditor';
import ConfigPanel from './components/ConfigPanel';
import { useAppStore } from './store/useAppStore';

function App() {
    const { currentPhase } = useAppStore();
    const [showConfig, setShowConfig] = useState(false);

    const renderPhase = () => {
        switch (currentPhase) {
            case 1: return <DocumentationManager />;
            case 2: return <AssetInventory />;
            case 3: return <DfdEditor />;
            default: return <DocumentationManager />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-end">
                    <button onClick={() => setShowConfig(true)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium">
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