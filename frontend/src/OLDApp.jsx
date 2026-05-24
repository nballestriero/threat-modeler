// src/App.jsx
import { useState } from 'react';
import AssetInventory from './components/AssetInventory';
import ConfigPanel from './components/ConfigPanel';
import DocumentationManager from './components/DocumentationManager';

function App() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">🛡️ Threat Modeler - Step 1</h1>
        <button 
          onClick={() => setShowConfig(true)} 
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
        >
          ⚙️ Configurazione
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <DocumentationManager />
        <AssetInventory />
      </main>

      {showConfig && <ConfigPanel onClose={() => setShowConfig(false)} />}
    </div>
  );
}

export default App;