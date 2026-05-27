import React, { useEffect, useState } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

export default function DfdEditor() {
    const { assets } = useThreatModelStore();
    const [mermaidCode, setMermaidCode] = useState('');
    const [dfdTaxonomy, setDfdTaxonomy] = useState(null);

    // Carica la tassonomia DFD base per forme e colori
    useEffect(() => {
        fetch('/api/taxonomy?type=dfd')
            .then(res => res.json())
            .then(data => setDfdTaxonomy(data))
            .catch(err => console.error('Errore caricamento tassonomia DFD:', err));
    }, []);

    useEffect(() => {
        if (!assets.length) {
            setMermaidCode('flowchart TD\n    A[Nessun asset. Torna alla fase Gestione Asset per aggiungerne.]');
            return;
        }

        // Mappa dalla categoria dell'asset al tipo DFD (se non abbiamo dfdTaxonomy, usiamo la mappa standard)
        const getDfdType = (category) => {
            if (dfdTaxonomy) {
                // Se la categoria è già una delle 3 DFD, la usiamo direttamente
                if (dfdTaxonomy.categories.some(c => c.name === category)) return category;
            }
            // Mappa dalle 7 categorie complete ai 3 tipi DFD
            const mapping = {
                'Actors': 'External Entity',
                'Processes': 'Process',
                'Models': 'Process',
                'Tools': 'Process',
                'Data': 'Data Store',
                'Infrastructure': 'Data Store',
                'Artefacts': 'Data Store'
            };
            return mapping[category] || 'Process';
        };

        // Forme Mermaid (default se non abbiamo dfdTaxonomy)
        const defaultShapes = {
            'External Entity': '(["{name}"])',
            'Process': '["{name}"]',
            'Data Store': '[({name})]'
        };

        const subgraphs = new Map();
        for (const asset of assets) {
            const dfdType = getDfdType(asset.category);
            let shape;
            if (dfdTaxonomy) {
                const catInfo = dfdTaxonomy.categories.find(c => c.name === dfdType);
                shape = catInfo?.shape || defaultShapes[dfdType] || '["{name}"]';
            } else {
                shape = defaultShapes[dfdType] || '["{name}"]';
            }
            const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
            const safeName = asset.name.replace(/"/g, '&quot;');
            const nodeDef = shape.replace('{name}', safeName);
            if (!subgraphs.has(dfdType)) subgraphs.set(dfdType, []);
            subgraphs.get(dfdType).push(`    ${safeId}${nodeDef}`);
        }

        let code = 'flowchart TD\n';
        for (const [type, nodeList] of subgraphs.entries()) {
            code += `    subgraph ${type}\n${nodeList.join('\n')}\n    end\n`;
        }
        setMermaidCode(code);
    }, [assets, dfdTaxonomy]);

    useEffect(() => {
        if (!mermaidCode) return;
        const render = async () => {
            const element = document.querySelector('.mermaid');
            if (element) {
                element.removeAttribute('data-processed');
                try {
                    await mermaid.run({ nodes: [element], suppressErrors: true });
                } catch (err) {
                    console.error('Mermaid error:', err);
                }
            }
        };
        render();
    }, [mermaidCode]);

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Fase 3: Data Flow Diagram (DFD)</h2>
            <p className="text-sm text-gray-500 mb-4">
                Visualizzazione dei flussi di dati tra gli asset (secondo la tassonomia DFD base).
                Per modificare gli asset, torna alla <strong>Fase 2 (Gestione Asset)</strong>.
            </p>
            <div className="border rounded p-4 bg-gray-50 overflow-auto min-h-[400px]">
                <div className="mermaid">{mermaidCode}</div>
            </div>
        </div>
    );
}