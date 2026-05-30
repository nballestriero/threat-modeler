/**
 * Componente principale dell'applicazione
 * Gestisce la navigazione laterale, l'inizializzazione dei dati e la visualizzazione delle fasi
 * @module App
 * 
 * @description
 * Questo componente è il punto di ingresso dell'interfaccia utente.
 * - Monta `<AppInitializer />` per caricare asset e flussi una sola volta all'avvio
 * - Gestisce la navigazione tra le 5 fasi del threat modeling tramite `useAppStore`
 * - Fornisce un pannello di configurazione accessibile globalmente
 * 
 * @see {@link ../components/AppInitializer.jsx} Componente di inizializzazione dati
 * @see {@link ../store/useAppStore.js} Store per la gestione della fase corrente
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DocumentationManager from './components/DocumentationManager';
import BaseAssetsManager from './components/BaseAssetsManager';
import DfdEditor from './components/DfdEditor';
import MethodologyManager from './components/MethodologyManager';
import MethodologyDfdView from './components/MethodologyDfdView';
import ConfigPanel from './components/ConfigPanel';
import AppInitializer from './components/AppInitializer';
import { useAppStore } from './store/useAppStore';

/**
 * Componente root dell'applicazione.
 * Wrappa l'intera UI con `<AppInitializer />` per garantire il caricamento centralizzato dei dati.
 * @returns {JSX.Element} L'albero dei componenti dell'applicazione
 */
function App() {
    const { currentPhase } = useAppStore();
    const [showConfig, setShowConfig] = useState(false);

    /**
     * Restituisce il componente corrispondente alla fase corrente.
     * Utilizza uno switch per mappare il numero di fase al componente React associato.
     * @returns {JSX.Element} Il componente della fase attiva
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
        // AppInitializer wrappa tutta l'UI: carica asset/flows una volta all'avvio
        <AppInitializer>
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
        </AppInitializer>
    );
}

export default App;