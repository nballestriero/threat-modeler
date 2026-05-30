/**
 * @file Componente per inizializzare i dati all'avvio dell'applicazione
 * @description Carica asset e flussi dal backend una sola volta, prima che i componenti figli vengano renderizzati.
 * @module AppInitializer
 */

import { useEffect } from 'react';
import useThreatModelStore from '../store/useThreatModelStore';

/**
 * Componente che inizializza i dati globali (asset, flussi) all'avvio.
 * Non renderizza nulla, ma esegue le chiamate API necessarie.
 * @param {Object} props - Proprietà del componente
 * @param {React.ReactNode} props.children - I componenti figli da renderizzare dopo l'inizializzazione
 * @returns {React.ReactNode} I children senza modifiche
 */
const AppInitializer = ({ children }) => {
    const { fetchAssets, fetchFlows, assetsLoaded, flowsLoaded } = useThreatModelStore();

    useEffect(() => {
        // Carica asset solo se non sono già stati caricati
        if (!assetsLoaded) {
            fetchAssets();
        }
        // Carica flussi solo se non sono già stati caricati
        if (!flowsLoaded) {
            fetchFlows();
        }
    }, [fetchAssets, fetchFlows, assetsLoaded, flowsLoaded]);

    return <>{children}</>;
};

export default AppInitializer;