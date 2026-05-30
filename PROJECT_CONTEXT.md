PROJECT_CONTEXT.md – threat-modeler
Ultimo aggiornamento: 31 maggio 2025
Versione contesto: 5.5
Manutenuto da: (da compilare)

🤖 Istruzione per LLM: Se stai leggendo questo file, assumi che rappresenti fedelmente lo stato attuale del progetto. Usalo per contestualizzare le tue risposte. Tutte le convenzioni descritte qui devono essere rispettate nel codice che suggerisci.

📌 Scopo dell'applicazione
threat-modeler è uno strumento assistito da intelligenza artificiale (LLM) progettato per:
- Aiutare esperti di threat modeling ad automatizzare l'estrazione di asset, la generazione di DFD e l'applicazione di metodologie di analisi dei rischi (STRIDE, PASTA, LINDDUN, FMEA, ecc.).
- Supportare studenti nell'apprendimento del threat modeling, guidandoli passo passo attraverso le fasi di analisi di un sistema software.

L'applicazione si integra con Ollama (LLM locale) e ChromaDB (RAG) per arricchire il contesto, suggerire miglioramenti e generare report automatici.

🎯 Obiettivi funzionali (visione completa)
| Fase | Descrizione |
|------|-------------|
| Configurazione | Pagine dedicate per impostare RAG, Ollama, database (alternativa ai JSON), e progetto corrente. |
| Raccolta documenti | Caricamento di documenti di progetto (specifiche, codice, architettura) e contesto (paper, best practice). |
| Analisi iniziale | Estrazione automatica degli asset (con tassonomia DFD base) usando LLM e RAG, per creare il DFD base. |
| Metodologie multiple | Applicazione di metodologie (PASTA, STRIDE, STRIDE-AI, FMEA, LINDDUN) partendo dall'asset base e dal DFD base, generando nuovi asset specifici per ogni metodologia. |
| Miglioramento assistito | In ogni fase, possibilità di usare l'LLM per affinare descrizioni, suggerire nuovi asset o arricchire i flussi. |
| Analisi rischi | Ricavare un elenco ordinato di rischi (con priorità) per supportare le decisioni di mitigazione, anche in contesti regolamentati (es. medico, energetico). |
| Report automatico | Generazione di un report finale (PDF o HTML) contenente asset, DFD, rischi e raccomandazioni. |

🧠 Architettura realizzata (al 31 maggio 2025)

Backend (Node.js + Express)
Layered architecture consolidata:
| Layer | Ruolo | Esempio |
|-------|-------|---------|
| Routes | Gestione HTTP (chiamano controller) | `analysis.js`, `assets.js` |
| Controllers | Orchestrazione, gestione errori | `assetExtractionController.js` |
| Services | Logica di business pura | `assetExtractionPipeline.js`, `ragService.js` |
| Models | I/O su file JSON | `assetModel.js` |
| Utils | Helper (config, errorHandler, file) | `configUtils.js`, `errorHandler.js` |

Servizi principali implementati:
- `TextExtractorService` – PDF, Markdown, TXT, HTML
- `ChunkService` – suddivisione con overlap
- `OllamaService` – chiamate a Ollama (timeout 120s)
- `RagService` – bridge Python o HTTP server per ChromaDB
- `MethodologyService` – gestione metodologie (manifesto, tassonomie, prompt)
- `AssetMergeService` – merging per similarità (trigrammi)
- `AssetExtractionPipeline` – orchestratore completo
- `AssetService`, `FlowService` – CRUD asset e flussi

RAG e metodologie:
- Ogni metodologia ha una collezione ChromaDB dedicata (`methodology_{id}`).
- All'avvio (se RAG abilitato) viene indicizzata automaticamente la tassonomia della metodologia (un documento per categoria).
- Durante l'estrazione, la pipeline arricchisce la query RAG con i nomi delle categorie.
- L'utente può caricare file di contesto che vengono indicizzati nella stessa collezione.

Test:
- ✅ 12 suite, 53 test → tutti passanti.
- ✅ Test di integrazione con ChromaDB reale e con mock di Ollama.

Frontend (React + Zustand + Vite)
Architettura unidirectional data flow:
```
UI components → Zustand store → API calls → Backend → Aggiornamento store → UI re-render
```

API layer: `src/api/` (`assetsApi`, `taxonomyApi`, `configApi`, `analysisApi`)
Config: `src/config/api.js` (axios instance con `VITE_API_BASE`)

Store Zustand – architettura consolidata
Store attivi e responsabilità:
| Store | File | Responsabilità | Componenti che lo usano |
|-------|------|---------------|------------------------|
| ✅ `useThreatModelStore` | `src/store/useThreatModelStore.js` | **Unica fonte di verità** per asset e flussi. Gestisce CRUD, flag di caricamento (`assetsLoaded`, `flowsLoaded`), e sincronizzazione con backend. | `BaseAssetsManager`, `DfdEditor`, `DocumentationManager`, `AppInitializer` |
| ✅ `useAppStore` | `src/store/useAppStore.js` | Gestione navigazione: `currentPhase` (1-5), stato sidebar. | `Sidebar`, `App` |
| ✅ `useAnalysisStore` | `src/store/useAnalysisStore.js` | Stato temporaneo estrazione asset (Fase 1): progresso, chunk, errori LLM. Isolato per non inquinare lo store principale. | `DocumentationManager` (solo durante estrazione) |

Store eliminati:
| Store | File | Motivazione | Data |
|-------|------|-------------|------|
| ❌ `useAssetStore` | `src/store/useAssetStore.js` | Ridondante: duplicava `useThreatModelStore`. Rischio desincronizzazione. Tutti i componenti migrati. | 31/05/2025 |

Principi architetturali store:
1. **Store monolitico per dati correlati**: asset e flussi sono strettamente accoppiati. Un solo store garantisce aggiornamenti atomici (es. delete asset → cleanup flussi orfani) e nessuna sincronizzazione manuale.
2. **Store separati per domini indipendenti**: navigazione (`useAppStore`) e stato transitorio (`useAnalysisStore`) rimangono isolati per evitare re-render non necessari.
3. **Selector stabili per Zustand**: prevenire infinite re-render usando selector che restituiscono riferimenti stabili.
   ```javascript
   // ✅ CORRETTO
   const assets = useThreatModelStore(state => state.assets);
   
   // ❌ DA EVITARE (crea oggetto nuovo ad ogni render)
   const { assets, flows } = useThreatModelStore(state => ({ assets: state.assets, flows: state.flows }));
   ```
   Alternativa sicura: `import { useShallow } from 'zustand/shallow';`
4. **Inizializzazione centralizzata**: `<AppInitializer />` monta una volta in `App.jsx` e popola lo store. I componenti leggono direttamente, senza fetch condizionali ridondanti.

Inizializzazione centralizzata (`AppInitializer`)
Componente React montato una volta sola in `App.jsx`.
- Scopo: chiamare `fetchAssets()` e `fetchFlows()` all'avvio.
- Risolve: chiamate duplicate e diagrammi vuoti al primo render.
- Fallback: i componenti mantengono `useEffect` con fetch, ma i flag nello store prevengono duplicati.

Componenti migrati (store monolitico)
| Componente | Store utilizzato | API layer | Note |
|------------|-----------------|-----------|------|
| `DocumentationManager` | `useThreatModelStore` + `useAnalysisStore` | `assetsApi`, `analysisApi` | Usa `useAnalysisStore` solo in fase di estrazione |
| `BaseAssetsManager` | `useThreatModelStore` | `assetsApi`, `taxonomyApi` | Migrato il 31/05/2025, include form creazione manuale |
| `DfdEditor` | `useThreatModelStore` | `flowsApi` (da creare) | Legge solo dallo store, gestisce flussi orfani visivamente |
| `Sidebar` | `useAppStore` | - | Solo navigazione |
| `App` | `useAppStore` + `AppInitializer` | - | Orchestratore, monta `AppInitializer` |
| `ConfigPanel` | (da migrare) | `configApi`, `taxonomyApi` | Priorità: media |
| `MethodologyManager` | (da migrare) | `methodologiesApi` (da creare) | Priorità: bassa |

⚠️ Known issues
Orphan flows (collegamenti orfani)
- **Problema**: cancellando un asset, i flussi associati rimanevano nel DB/store.
- **Soluzione implementata – Opzione C**:
  - ✅ Flussi orfani visualizzati con linea tratteggiata rossa e tooltip "⚠️ Collegamento interrotto"
  - ✅ Eliminazione manuale possibile dalla tabella flussi in `DfdEditor`
  - ✅ Badge "Orfano" e colonne "Da/A" evidenziate in rosso quando asset mancanti
- **Stato**: ✅ Implementato in `DfdEditor.jsx` (31/05/2025)

🚧 Passi mancanti (priorità)
Frontend (immediati)
- [ ] Migrare `ConfigPanel.jsx` a `configApi` e `taxonomyApi`
- [ ] Creare `flowsApi.js` per completare migrazione `DfdEditor`
- [ ] Creare `methodologiesApi.js` per `MethodologyManager`

Backend (opzionali/migliorativi)
- [ ] Validazione input con Zod sugli endpoint critici
- [ ] Supporto formati aggiuntivi (DOCX, ODT)
- [ ] Generazione report automatico (PDF/HTML) da template

Cleanup (priorità bassa)
- [ ] Eliminare file legacy: `backend/OLD_2_server.js`, `backend/OLD_server.js`, `backend/testServer.js`, `backend/advanced-assets.json`, `frontend/src/OLDApp.jsx`, `frontend/src/components/OLD_*`

Generali
- [ ] Test frontend (Jest + React Testing Library)
- [ ] GitHub Actions per test automatici
- [ ] Documentazione API (Swagger/OpenAPI)

📚 Strategia documentazione
- Diagrammi architetturali: `docs/architecture/stores.md`, `docs/architecture/pipelines.md`
Struttura directory:
```
docs/
├── architecture/
│   ├── stores.md           # Diagrammi store + flussi dati
│   ├── pipelines.md        # Pipeline estrazione, RAG, metodologie
│   └── components.md       # Mappa componenti React + dipendenze
├── api/
│   ├── backend-openapi.yaml
│   └── frontend-api-layer.md
├── guides/
│   ├── adding-a-store.md
│   ├── migrating-component.md
│   └── testing-frontend.md
└── README.md
```
Regole di manutenzione:
1. Diagrammi Mermaid nei file `.md` (renderizzabili nativamente su GitHub/VS Code)
2. JSDoc obbligatorio per funzioni pubbliche (`@module`, `@param`, `@returns`)
3. Checklist pre-merge: aggiornare `PROJECT_CONTEXT.md`, diagrammi architetturali, JSDoc
4. Automazione futura: GitHub Action per generare docs su push a `main`

🔧 Comandi utili
```bash
# Backend
cd backend
npm test                 # esegue tutti i test
npm run docs:all         # genera HTML (docs/backend) + Markdown per LLM
npm start                # avvia server (porta 3001)

# Frontend
cd frontend
npm run dev              # avvia Vite (porta 5173)
npm run build            # build produzione
rm -rf node_modules/.vite && npm run dev  # cache Vite

# Variabili d'ambiente
VITE_API_BASE=http://localhost:3001/api
```

📌 Note tecniche importanti
- **Estensioni file**: `.js` per moduli senza JSX (API, store, config), `.jsx` solo per componenti React.
- **Percorsi relativi**: da `src/components/` usare `../store/...` e `../api/...` (un solo `..`).
- **Cache Vite**: cancellare `node_modules/.vite` se errori di import persistenti.
- **Store monolitico**: non frammentare `useThreatModelStore` senza motivazione architetturale forte.
- **AppInitializer**: montare una volta in `App.jsx`, prima del layout. Non renderizza UI.
- **Selector Zustand**: usare sempre selector semplici o `useShallow`. Evitare oggetti inline.

📎 Riferimenti
| Risorsa | Link / Percorso |
|---------|----------------|
| Repository | https://github.com/nballestriero/threat-modeler |
| Documentazione backend | `docs/backend/index.html` |
| Contesto LLM | Questo file (`PROJECT_CONTEXT.md`) |
| Script RAG Python | `backend/services/rag_bridge.py` |
| Manifesto metodologie | `backend/methodologies/manifest.json` |
| Store frontend | `frontend/src/store/useThreatModelStore.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |
| Architettura store | `docs/architecture/stores.md` (da creare) |
| Pipeline AI | `docs/architecture/pipelines.md` (da creare) |

🔚 Fine del documento
Ultima verifica: 31 maggio 2025
Prossima revisione: al completamento della migrazione di `ConfigPanel.jsx` e creazione di `flowsApi.js`