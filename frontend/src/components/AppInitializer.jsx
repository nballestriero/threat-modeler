/**
 * AppInitializer - Componente di inizializzazione globale
 * @module components/AppInitializer
 */

import React, { useEffect } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';

export default function AppInitializer({ children }) {
    const { fetchAssets, fetchFlows, assetsLoaded, flowsLoaded, resetLoadedFlags } = useThreatModelStore();

    // Caricamento iniziale
    useEffect(() => {
        if (!assetsLoaded) fetchAssets();
        if (!flowsLoaded) fetchFlows();
    }, [fetchAssets, fetchFlows, assetsLoaded, flowsLoaded]);

    // Ascolta cambio progetto e ricarica FORZATAMENTE i dati
    useEffect(() => {
        const handleProjectChange = () => {
            // 1. Resetta i flag
            resetLoadedFlags();
            // 2. Forza il fetch ignorando i vecchi stati
            fetchAssets(true);
            fetchFlows(true);
        };

        window.addEventListener('projectChanged', handleProjectChange);
        return () => window.removeEventListener('projectChanged', handleProjectChange);
    }, [resetLoadedFlags, fetchAssets, fetchFlows]);

    return <>{children}</>;
}