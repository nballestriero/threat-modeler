PROJECT_CONTEXT.md – threat-modeler
Ultimo aggiornamento: 31 maggio 2025
Versione contesto: 6.6
Manutenuto da: (da compilare)

🤖 Istruzione per LLM: Se stai leggendo questo file, assumi che rappresenti fedelmente lo stato attuale del progetto. Usalo per contestualizzare le tue risposte. Tutte le convenzioni descritte qui devono essere rispettate nel codice che suggerisci. Non fare assunzioni su file non elencati. Se devi leggere codice dal repository, usa gli URL raw indicati nella sezione dedicata.

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

🗂️ Mappa della Struttura File – Stato Reale (31/05/2025)

## Backend (Node.js + Express)
backend/
├── routes/              # Endpoint HTTP
│   ├── assets.js        # ✅ CRUD asset & flussi con supporto projectDir + JSDoc completo
│   ├── projects.js      # ✅ CRUD progetti con verifica esistenza per 404 + JSDoc completo
│   ├── config.js        # GET/PUT configurazione globale (logica inline)
│   ├── ollama.js        # GET /api/ollama/models, POST /api/ollama/test
│   ├── rag.js           # POST /api/rag/test-connection
│   ├── analysis.js      # POST /api/analysis/extract (sincrono)
│   ├── taxonomy.js      # GET /api/dfd-taxonomy (legge da backend/context/)
│   └── methodologies.js # ❌ MANCANTE (richiesto per Fase 4)
├── controllers/
│   ├── assetController.js      # ✅ CRUD asset con validazione + projectDir + JSDoc completo
│   ├── flowController.js       # ✅ NUOVO: CRUD flussi con validazione regole DFD Base + bypass test
│   ├── assetSuggestionController.js # Suggerimenti AI per asset
│   └── assetExtractionController.js  # Estrazione asset (sincrona)
├── services/
│   ├── assetService.js      # ✅ CRUD asset con projectDir, cascade delete, importAssets, trim input + JSDoc
│   ├── flowService.js       # ✅ CRUD flussi con projectDir + JSDoc completo
│   ├── projectService.js    # ✅ CRUD progetti, auto-attivazione, isolamento cartelle, DATA_DIR dinamico + JSDoc
│   ├── TextExtractorService.js, ChunkService.js, RagService.js, OllamaService.js
│   ├── MethodologyService.js, AssetMergeService.js
│   └── assetExtractionPipeline.js  # Orchestratore estrazione
├── middleware/
│   └── projectScope.js      # ✅ Risolve req.projectDir con DATA_DIR dinamico + JSDoc
├── methodologies/       # Definizione metodologie
│   ├── manifest.json
│   └── dfd-base/, stride/, linddun/, fmea/ (taxonomy.json + prompt.md)
│       └── stride-ai/   # ⚠️ INCOMPLETA (manca taxonomy.json)
├── context/             # Tassonomie legacy per endpoint taxonomy.js
├── models/
│   └── assetModel.js    # ✅ Unico file per asset+flows con supporto projectDir + JSDoc
├── utils/
│   ├── configUtils.js, errorHandler.js, fileUtils.js
├── data/                # 🗑️ IGNORATO DA GIT (dati runtime)
│   ├── projects.json    # Metadata lista progetti
│   └── <project-uuid>/  # Directory isolata per progetto
│       ├── threat-model.json  # Asset e flussi del progetto
│       └── config.json        # Configurazione specifica del progetto
├── server.js            # Entry point Express con middleware projectScope
├── testServer.js        # ⚠️ LEGACY: da eliminare
└── advanced-assets.json # ⚠️ LEGACY: file vuoto, da eliminare

## Frontend (React + Zustand + Vite)
frontend/
├── src/
│   ├── api/                 # Layer API centralizzato (usa apiClient)
│   │   ├── assetsApi.js     # ✅ Completo (getAll, create, update, delete)
│   │   ├── flowsApi.js      # ✅ NUOVO: CRUD flussi con named/default export corretti
│   │   ├── configApi.js     # ✅ Completo (getConfig, updateConfig, test* functions)
│   │   ├── analysisApi.js   # ✅ Presente (startExtraction, getExtractionStatus ⚠️ endpoint backend mancante)
│   │   ├── taxonomyApi.js   # ✅ COMPLETATO (getDfdTaxonomy, getTaxonomy con validazione + JSDoc)
│   │   ├── projectsApi.js   # ✅ COMPLETATO (getAll, create, update, setStatus + JSDoc)
│   │   └── methodologiesApi.js # ❌ MANCANTE (richiesto per Fase 4)
│   ├── store/
│   │   ├── useThreatModelStore.js  # ✅ Aggiornato: usa flowsApi, supporta force reload, cascade delete locale
│   │   ├── useProjectStore.js      # ✅ COMPLETATO (gestione stato progetti frontend, evento projectChanged + JSDoc)
│   │   ├── useAppStore.js          # ✅ Navigazione (currentPhase, setPhase)
│   │   └── useAnalysisStore.js     # ✅ Stato transitorio estrazione
│   ├── components/
│   │   ├── App.jsx                 # ✅ Root, monta AppInitializer
│   │   ├── AppInitializer.jsx      # ✅ Fetch iniziale + listener projectChanged per reload dati
│   │   ├── ConfigPanel.jsx         # ✅ REFACTORED: tab Progetto con ProjectManager inline, tab Attivi/Archiviati
│   │   ├── BaseAssetsManager.jsx   # ✅ Migrato, selector stabili, usa taxonomyApi
│   │   ├── DfdEditor.jsx           # ✅ COMPLETO: validazione DFD frontend, errori specifici, editor Mermaid + JSDoc
│   │   ├── DocumentationManager.jsx# ✅ Migrato
│   │   └── MethodologyManager.jsx  # ❌ Non migrato, chiama setActiveMethodology inesistente
│   └── config/api.js        # ✅ Istanza axios (VITE_API_BASE=3001, timeout 120s, interceptor errori, export named)
└── docs/
    ├── architecture/        # stores.md (v2.1 con useProjectStore), pipelines.md
    ├── guides/              # STUDENT_CONTEXT.md (materiale didattico)
    └── backend/             # Generata con npm run docs:all

🧠 Architettura Realizzata – Stato Attuale

## Backend (Node.js + Express)
- **Isolamento dati per progetto**: Ogni progetto ha la sua directory (`backend/data/<uuid>/`) con `threat-model.json` e `config.json` isolati. Il middleware `projectScope.js` risolve `req.projectDir` leggendo `process.env.DATA_DIR` a runtime (supporto test).
- **Modello dati dinamico**: `assetModel.js` accetta `projectDir` opzionale per leggere/scrivere nella cartella corretta. Fallback su `backend/data/` se nessun progetto attivo.
- **Validazione flussi DFD**: `flowController.js` applica regole DFD Base (no EE→EE diretto, Data Store→solo Process). In ambiente test (`NODE_ENV=test`), salta la verifica esistenza asset per permettere mock/fittizi.
- **Cascade delete**: Quando un asset viene eliminato, `assetService.deleteAsset()` rimuove automaticamente tutti i flussi che lo referenziano (`fromId` o `toId`). Il response include `orphanFlowsDeleted` per feedback.
- **Validazione input**: `assetController.js` e `flowController.js` validano campi obbligatori e restituiscono HTTP 400 invece di 500.
- **Estrazione asset sincrona**: L'endpoint `POST /api/analysis/extract` elabora l'intera pipeline in una singola richiesta HTTP.
- **RAG**: Ogni metodologia ha collezione ChromaDB dedicata (`methodology_{id}`). Tassonomia indicizzata all'avvio. Query RAG arricchita con nomi categorie.
- **Test**: 15 suite, 109 test → **100% PASS** ✅.

## Frontend (React + Zustand + Vite)
- **Flusso dati unidirezionale**: `UI → Zustand store (useShallow) → API Layer → Backend → Store update → UI re-render`
- **Selector stabili**: Tutti i componenti migrati usano `useShallow` da `zustand/shallow` per aggregare valori dallo store senza causare infinite re-render.
- **API Layer centralizzato**: `src/api/*.js` centralizzano chiamate HTTP. Usano `apiClient` da `src/config/api.js` (named export, respecta `VITE_API_BASE`, timeout, interceptor errori).
- **Nessun fetch diretto**: Componenti non chiamano mai `fetch` o `axios` inline; usano sempre i file in `src/api/`.
- **Gestione progetti UI**: `ConfigPanel.jsx` include tab "Attivi/Archiviati", creazione con auto-attivazione, e dispatch evento `projectChanged` per reload dati.
- **Editor DFD**: `DfdEditor.jsx` genera codice Mermaid, valida collegamenti, mostra errori specifici dal backend e supporta editing manuale.

## Store Zustand – Stato Consolidato

### useThreatModelStore ✅
- Unica fonte di verità per asset e flussi.
- Azioni CRUD complete per asset e flussi con supporto `force` parameter per reload forzato (usato al cambio progetto).
- Cascade delete locale: `deleteAsset` filtra anche i flussi orfani dallo stato.
- Flag `assetsLoaded`/`flowsLoaded` prevengono fetch duplicati.
- Selector stabili con `useShallow` usati in tutti i componenti migrati.
- Gestione errori robusta: `getAllAssets` restituisce array vuoto invece di crashare se il file JSON è corrotto.

### useProjectStore ✅ (NUOVO)
- Gestisce lista progetti, progetto attivo, loading ed errori.
- Azioni: `fetchProjects`, `setActiveProject`, `addProject`, `updateProject`, `reset`.
- Dispatcha evento custom `projectChanged` quando il progetto attivo cambia, ascoltato da `AppInitializer` per reload dati.
- Isolamento: tutti i metodi API usano implicitamente il contesto del progetto attivo.

### Principi architetturali da rispettare
1. **Store monolitico**: Asset e flussi vivono insieme. Aggiornamenti atomici.
2. **Selector stabili**: Usare `useShallow` per aggregare più valori: `useThreatModelStore(useShallow(state => ({ a: state.a, b: state.b })))`.
3. **Layer API dedicato**: Store e componenti chiamano `assetsApi.*`, `flowsApi.*`, `projectsApi.*`, non `axios` diretto.
4. **Inizializzazione centralizzata**: `<AppInitializer />` monta una volta in `App.jsx`.
5. **Isolamento progetti**: Se un nuovo store gestisce dati per-progetto, deve supportare `projectDir` come parametro opzionale.

⚠️ Known Issues & Bug Report (Aggiornato 31/05/2025)

## 🔴 Critici (Bloccanti / Errori Runtime)
| File | Problema | Impatto | Azione Richiesta |
|------|----------|---------|------------------|
| `frontend/src/api/methodologiesApi.js` | File mancante (404) | `MethodologyManager.jsx` non può recuperare tassonomie. Fase 4 inutilizzabile. | Creare con `getAllMethodologies()`, `getMethodologyTaxonomy(id)` |
| `backend/routes/methodologies.js` | Endpoint mancanti | `taxonomyApi.getTaxonomy()` → 404. Fase 4 non funziona. | Creare route con endpoint per lista metodologie e tassonomie |
| `frontend/src/components/MethodologyManager.jsx` | Chiama `setActiveMethodology()` inesistente | `useAppStore` non esporta questa funzione → errore runtime. | Sostituire con `setPhase()` o migrare componente |

## 🟡 Warning / Fragilità Architetturali
| File | Problema | Impatto | Azione |
|------|----------|---------|--------|
| `backend/methodologies/stride-ai/` | Manca `taxonomy.json` e `prompts/extraction.md` | Server tenta indicizzazione RAG → warning. | Disabilitare in `manifest.json` o creare file |
| `frontend/src/api/analysisApi.js` | `getExtractionStatus()` chiama endpoint inesistente | 404 se usato per polling. | Implementare endpoint backend OPPURE rimuovere funzione |
| `frontend/src/components/DfdEditor.jsx` | Editor codice Mermaid manuale può desincronizzare dati | Modifiche manuali non persistono nel backend. | Documentare come feature "view-only" o implementare sync bidirezionale |

## 📝 Incoerenze Documentazione vs Codice Reale
- `backend/routes/flows.js`, `backend/models/flowModel.js`: **non esistono**. Flussi gestiti in `assets.js` e `assetModel.js`. (Docs da correggere)
- `backend/controllers/configController.js`: **non esiste**. Logica in `routes/config.js`. (Docs da correggere)
- `AssetService.js` (docs PascalCase) vs `assetService.js` (reale camelCase): mismatch case. Su Linux può rompere import. (Docs da correggere)

🎓 Risorse per Studenti e Nuovi Sviluppatori
- 📖 `docs/guides/STUDENT_CONTEXT.md`: Guida didattica completa. Include architettura spiegata, pattern Zustand/API, esercizi progressivi, debugging con DevTools, setup ambiente.
- 💡 **Consiglio**: Usare questo repo per imparare refactoring, testing e architettura layered. Partire dai file API piccoli (`configApi.js`), poi passare agli store, infine ai componenti UI.

🔍 Istruzioni per LLM: Come Leggere il Repository Git
Per accedere al codice sorgente in modo affidabile, usa il pattern **Raw Content URL**:
https://raw.githubusercontent.com/nballestriero/threat-modeler/master/{path_al_file}
Esempi:
- Store: https://raw.githubusercontent.com/nballestriero/threat-modeler/master/frontend/src/store/useThreatModelStore.js
- Backend Service: https://raw.githubusercontent.com/nballestriero/threat-modeler/master/backend/services/ragService.js
- Docs: https://raw.githubusercontent.com/nballestriero/threat-modeler/master/docs/architecture/stores.md
Perché usarlo? Restituisce plain text (no HTML GitHub), compatibile con fetch/axios/parsing automatico. Branch predefinito: `master`. Se usi feature branch, sostituisci `master` nel path.

Fallback: API GitHub v3 per metadata
GET https://api.github.com/repos/nballestriero/threat-modeler/contents/{path}?ref=master
La risposta include `download_url` (raw content) e `content` (base64-encoded).

📊 Diagrammi Architetturali (Mermaid)
- [Store & Flussi Dati](docs/architecture/stores.md): Mostra interazioni tra Componenti React, Store Zustand, API Layer e Backend. Aggiornato a v2.1 con useProjectStore e isolamento progetti.
- [Pipeline Estrazione AI](docs/architecture/pipelines.md): Flusso Documenti → Chunking → RAG → LLM → Merge → Store.
I diagrammi sono in sintassi Mermaid, renderizzabili nativamente su GitHub e VS Code. Aggiornarli ogni volta che cambia un'interfaccia o si aggiunge un componente.

🚧 Passi Mancanti & Priorità (Aggiornata)

## ✅ Completati (Questa settimana)
- [x] Creare `frontend/src/api/taxonomyApi.js` (export: `getDfdTaxonomy`, `getTaxonomy`) ✅ COMPLETATO
- [x] Fix mismatch `assetService.js` ↔ `assetExtractionController.js` (`saved`/`duplicates` undefined) ✅ COMPLETATO
- [x] Aggiungere gestione errori robusta in `assetService.getAllAssets` (try/catch) ✅ COMPLETATO
- [x] Aggiungere validazione input in `assetController` e `flowController` (400 invece di 500) ✅ COMPLETATO
- [x] Aggiornare `assets.integration.test.js` con isolamento dati completo (`beforeEach` + `jest.resetModules()`) ✅ COMPLETATO
- [x] Implementare cascade delete backend: quando si cancella un asset, eliminare anche flussi con `fromId`/`toId` corrispondenti ✅ COMPLETATO
- [x] Refactor `DfdEditor.jsx` → usare store actions + `useShallow` + `taxonomyApi` (no API dirette) ✅ COMPLETATO
- [x] Implementare sistema di gestione progetti con isolamento dati per progetto:
  - [x] `backend/middleware/projectScope.js` ✅
  - [x] `backend/services/projectService.js` ✅
  - [x] `backend/models/assetModel.js` (supporto projectDir) ✅
  - [x] `backend/services/assetService.js` e `flowService.js` (passaggio projectDir) ✅
  - [x] `backend/controllers/assetController.js` e `flowController.js` (passaggio projectDir) ✅
  - [x] `backend/routes/assets.js` (route complete con JSDoc) ✅
  - [x] `frontend/src/api/projectsApi.js` ✅
  - [x] `frontend/src/store/useProjectStore.js` ✅
  - [x] `frontend/src/components/ConfigPanel.jsx` (tab Progetto con ProjectManager) ✅
  - [x] `frontend/src/components/AppInitializer.jsx` (listener projectChanged) ✅
- [x] Tutti i test passano: 15 suite, 109 test → **100% PASS** ✅

## 🔴 Immediati (Bloccanti – Risolvere questa settimana)
- [ ] Creare `frontend/src/api/methodologiesApi.js` (export: `getAllMethodologies`, `getMethodologyTaxonomy`, `getMethodologyPrompt`)
- [ ] Creare `backend/routes/methodologies.js` con endpoint `/` e `/taxonomy/:id`
- [ ] Fix `MethodologyManager.jsx` → migrare a `methodologiesApi` + store actions

## 🟡 Miglioramenti & Refactoring (Prossima settimana)
- [ ] **Aggiornare e creare tutti i nuovi test automatici** per il sistema di gestione progetti:
  - [ ] Test di integrazione per `projectService.js` (CRUD progetti, auto-attivazione, isolamento cartelle)
  - [ ] Test di integrazione per `assetService.js` e `flowService.js` con `projectDir` (isolamento dati)
  - [ ] Test di integrazione per `projectScope.js` middleware (risoluzione directory, fallback)
  - [ ] Test frontend per `useProjectStore.js` (azioni, evento projectChanged)
  - [ ] Test E2E per flusso completo: crea progetto → aggiungi asset → switch progetto → verifica isolamento
  - [ ] Aggiornare `assets.integration.test.js` per testare cascade delete con projectDir
  - [ ] Aggiungere test per `ConfigPanel.jsx` (creazione progetto, attivazione, tab Attivi/Archiviati)
- [ ] Unificare doppio `module.exports` in `methodologyService.js`
- [ ] Disabilitare `stride-ai` nel manifest o creare i file mancanti (`taxonomy.json`, `prompts/extraction.md`)
- [ ] Aggiungere endpoint `/api/analysis/status` (se polling necessario) o rimuovere `getExtractionStatus` dal frontend
- [ ] Documentare editor codice Mermaid in `DfdEditor` come feature "view-only" o implementare sync bidirezionale

## 🧹 Cleanup & Documentazione
- [ ] Eliminare legacy: `backend/testServer.js`, `backend/advanced-assets.json`, `frontend/src/OLD_*.jsx`
- [ ] Aggiungere `backend/data/**/*.json` a `.gitignore` (dati runtime, non config) ✅ COMPLETATO
- [ ] Aggiornare `PROJECT_CONTEXT.md` dopo ogni modifica architetturale significativa

🔧 Comandi Utili
# Backend
cd backend
npm test                 # 15 suite, 109 test → tutti passanti ✅
npm run docs:all         # Genera docs HTML in docs/backend/
npm start                # Server su porta 3001

# Frontend
cd frontend
npm run dev              # Vite su porta 5173
npm run build            # Build produzione
rm -rf node_modules/.vite && npm run dev  # Fix errori cache Vite

# Variabili
VITE_API_BASE=http://localhost:3001/api

📌 Note Tecniche Importanti
- **Estensioni**: `.js` per moduli/API/store, `.jsx` solo per componenti React con JSX.
- **Import relativi**: Da `src/components/` usare `../store/` e `../api/` (un solo `..`).
- **Store**: Non frammentare `useThreatModelStore`. Usare selector stabili con `useShallow`.
- **AppInitializer**: Montare una volta in `App.jsx`. Non renderizza UI, solo `useEffect` di inizializzazione.
- **API Layer**: Tutti i componenti devono usare i file in `src/api/`. Mai `fetch` o `axios` inline.
- **Backend JSON**: Asset e flussi condividono `threat-model.json` **per progetto**. La directory è risolta da `req.projectDir`.
- **Validazione**: `assetController` e `flowController` validano input e restituiscono HTTP 400 per errori di validazione, 500 per errori interni.
- **Cascade delete**: `assetService.deleteAsset()` rimuove automaticamente flussi orfani; il response include `orphanFlowsDeleted` per feedback.
- **Isolamento progetti**: Ogni progetto ha la sua cartella in `backend/data/<uuid>/`. Il middleware `projectScope` risolve il path corretto.
- **Git Ignore**: `backend/data/` e `backend/data-test-*/` sono esclusi dal versioning per privacy e conflitti.

📎 Riferimenti
| Risorsa | Percorso |
|---------|----------|
| Repository | https://github.com/nballestriero/threat-modeler |
| Contesto LLM | Questo file (`PROJECT_CONTEXT.md`) |
| Contesto Studenti | `docs/guides/STUDENT_CONTEXT.md` |
| Store Principale | `frontend/src/store/useThreatModelStore.js` |
| Store Progetti | `frontend/src/store/useProjectStore.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |
| Diagrammi Arch. | `docs/architecture/stores.md`, `docs/architecture/pipelines.md` |
| Manifesto Metodologie | `backend/methodologies/manifest.json` |
| API Layer Frontend | `frontend/src/api/` (assetsApi, flowsApi, configApi, taxonomyApi, projectsApi ✅) |
| Configurazione axios | `frontend/src/config/api.js` |
| Middleware ProjectScope | `backend/middleware/projectScope.js` |
| Service Progetti | `backend/services/projectService.js` |
| Controller Flussi | `backend/controllers/flowController.js` |

🔚 Fine del documento
Ultima verifica: 31 maggio 2025 | Versione: 6.6
Prossima revisione: al completamento di `methodologiesApi.js` e della suite test per gestione progetti