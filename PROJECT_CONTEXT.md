PROJECT_CONTEXT.md – threat-modeler
Ultimo aggiornamento: 31 maggio 2025
Versione contesto: 6.3
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
```
backend/
├── routes/              # Endpoint HTTP
│   ├── assets.js        # CRUD asset & flussi (gestiti insieme nel modello JSON)
│   ├── config.js        # GET/PUT configurazione globale (logica inline)
│   ├── ollama.js        # GET /api/ollama/models, POST /api/ollama/test
│   ├── rag.js           # POST /api/rag/test-connection
│   ├── analysis.js      # POST /api/analysis/extract (sincrono)
│   ├── taxonomy.js      # GET /api/dfd-taxonomy (legge da backend/context/)
│   └── methodologies.js # ❌ MANCANTE (richiesto per Fase 4)
├── controllers/
│   ├── assetController.js      # ✅ CRUD asset con validazione input (name, category) + cascade delete
│   ├── flowController.js       # ✅ CRUD flussi con validazione (fromId, toId, label)
│   └── assetExtractionController.js  # Estrazione asset (sincrona)
├── services/
│   ├── assetService.js      # ✅ CRUD su JSON con cascade delete per flussi orfani + gestione errori robusta
│   ├── flowService.js       # CRUD flussi su JSON
│   ├── TextExtractorService.js, ChunkService.js, RagService.js, OllamaService.js
│   ├── MethodologyService.js, AssetMergeService.js
│   └── assetExtractionPipeline.js  # Orchestratore estrazione
├── methodologies/       # Definizione metodologie
│   ├── manifest.json
│   └── dfd-base/, stride/, linddun/, fmea/ (taxonomy.json + prompt.md)
│       └── stride-ai/   # ⚠️ INCOMPLETA (manca taxonomy.json)
├── context/             # Tassonomie legacy per endpoint taxonomy.js
├── models/
│   └── assetModel.js    # Unico file per asset+flows (threat-model.json)
├── utils/
│   ├── configUtils.js, errorHandler.js (definisce asyncHandler ma non usato), fileUtils.js
├── data/                # JSON persistenti
├── server.js            # Entry point Express
├── testServer.js        # ⚠️ LEGACY: da eliminare
└── advanced-assets.json # ⚠️ LEGACY: file vuoto, da eliminare
```

## Frontend (React + Zustand + Vite)
```
frontend/
├── src/
│   ├── api/                 # Layer API centralizzato (usa apiClient)
│   │   ├── assetsApi.js     # ✅ Completo (getAll, create, update, delete)
│   │   ├── flowsApi.js      # ✅ Completo (getFlows, createFlow, updateFlow, deleteFlow)
│   │   ├── configApi.js     # ✅ Completo (getConfig, updateConfig, test* functions)
│   │   ├── analysisApi.js   # ✅ Presente (startExtraction, getExtractionStatus ⚠️ endpoint backend mancante)
│   │   ├── taxonomyApi.js   # ✅ COMPLETATO (getDfdTaxonomy, getTaxonomy con validazione)
│   │   └── methodologiesApi.js # ❌ MANCANTE (richiesto per Fase 4)
│   ├── store/
│   │   ├── useThreatModelStore.js  # ✅ Monolitico per asset+flows, selector stabili, azioni CRUD complete per flussi
│   │   ├── useAppStore.js          # ✅ Navigazione (currentPhase, setPhase)
│   │   └── useAnalysisStore.js     # ✅ Stato transitorio estrazione
│   ├── components/
│   │   ├── App.jsx                 # ✅ Root, monta AppInitializer
│   │   ├── AppInitializer.jsx      # ✅ Fetch iniziale centralizzato
│   │   ├── ConfigPanel.jsx         # ✅ Migrato, UI a tab, usa configApi + apiClient per test
│   │   ├── BaseAssetsManager.jsx   # ✅ Migrato, selector stabili, usa taxonomyApi
│   │   ├── DfdEditor.jsx           # ✅ REFACTORED: usa store actions + useShallow + taxonomyApi (no API dirette)
│   │   ├── DocumentationManager.jsx# ✅ Migrato
│   │   └── MethodologyManager.jsx  # ❌ Non migrato, chiama setActiveMethodology inesistente
│   └── config/api.js        # ✅ Istanza axios (VITE_API_BASE=3001, timeout 120s, interceptor errori)
└── docs/
    ├── architecture/        # stores.md, pipelines.md (Mermaid)
    ├── guides/              # STUDENT_CONTEXT.md (materiale didattico)
    └── backend/             # Generata con npm run docs:all
```

🧠 Architettura Realizzata – Stato Attuale

## Backend (Node.js + Express)
- **Modello dati unico**: Asset e flussi sono gestiti nello stesso file JSON (`threat-model.json`) tramite `assetModel.js`.
- **Validazione input**: `assetController.js` e `flowController.js` validano campi obbligatori (`name`, `category`, `fromId`, `toId`, `label`) e restituiscono HTTP 400 invece di 500.
- **Cascade delete**: Quando un asset viene eliminato, `assetService.deleteAsset()` rimuove automaticamente tutti i flussi che lo referenziano (`fromId` o `toId`). Il response include `orphanFlowsDeleted` per feedback all'utente.
- **Estrazione asset sincrona**: L'endpoint `POST /api/analysis/extract` elabora l'intera pipeline in una singola richiesta HTTP.
- **RAG**: Ogni metodologia ha collezione ChromaDB dedicata (`methodology_{id}`). Tassonomia indicizzata all'avvio. Query RAG arricchita con nomi categorie.
- **Test**: 12 suite, 70 test → **tutti passanti** ✅.

## Frontend (React + Zustand + Vite)
- **Flusso dati unidirezionale**: `UI → Zustand store (useShallow) → API Layer → Backend → Store update → UI re-render`
- **Selector stabili**: Tutti i componenti migrati usano `useShallow` da `zustand/shallow` per aggregare valori dallo store senza causare infinite re-render.
- **API Layer centralizzato**: `src/api/*.js` centralizzano chiamate HTTP. Usano `apiClient` da `src/config/api.js` (respecta `VITE_API_BASE`, timeout, interceptor errori).
- **Nessun fetch diretto**: Componenti non chiamano mai `fetch` o `axios` inline; usano sempre i file in `src/api/`.

## Store Zustand – Stato Consolidato

### Cosa funziona ✅
- `useThreatModelStore` è l'unica fonte di verità per asset e flussi.
- Azioni CRUD complete per asset: `fetchAssets`, `addAsset`, `updateAsset`, `deleteAsset`.
- Azioni CRUD complete per flussi: `fetchFlows`, `addFlow`, `updateFlow`, `deleteFlow`.
- Cascade delete locale: `deleteAsset` filtra anche i flussi orfani dallo stato.
- Flag `assetsLoaded`/`flowsLoaded` prevengono fetch duplicati.
- Selector stabili con `useShallow` usati in tutti i componenti migrati.
- Gestione errori robusta: `getAllAssets` restituisce array vuoto invece di crashare se il file JSON è corrotto.

### Principi architetturali da rispettare
1. **Store monolitico**: Asset e flussi vivono insieme. Aggiornamenti atomici.
2. **Selector stabili**: Usare `useShallow` per aggregare più valori: `useThreatModelStore(useShallow(state => ({ a: state.a, b: state.b })))`.
3. **Layer API dedicato**: Store e componenti chiamano `assetsApi.*`, `flowsApi.*`, non `axios` diretto.
4. **Inizializzazione centralizzata**: `<AppInitializer />` monta una volta in `App.jsx`.

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
```
https://raw.githubusercontent.com/nballestriero/threat-modeler/master/{path_al_file}
```
Esempi:
- Store: `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/frontend/src/store/useThreatModelStore.js`
- Backend Service: `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/backend/services/ragService.js`
- Docs: `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/docs/architecture/stores.md`

Perché usarlo? Restituisce plain text (no HTML GitHub), compatibile con fetch/axios/parsing automatico. Branch predefinito: `master`. Se usi feature branch, sostituisci `master` nel path.

Fallback: API GitHub v3 per metadata
```
GET https://api.github.com/repos/nballestriero/threat-modeler/contents/{path}?ref=master
```
La risposta include `download_url` (raw content) e `content` (base64-encoded).

📊 Diagrammi Architetturali (Mermaid)
- [Store & Flussi Dati](docs/architecture/stores.md): Mostra interazioni tra Componenti React, Store Zustand, API Layer e Backend.
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
- [x] Tutti i test passano: 12 suite, 70 test → **100% PASS** ✅

## 🔴 Immediati (Bloccanti – Risolvere questa settimana)
- [ ] Creare `frontend/src/api/methodologiesApi.js` (export: `getAllMethodologies`, `getMethodologyTaxonomy`, `getMethodologyPrompt`)
- [ ] Creare `backend/routes/methodologies.js` con endpoint `/` e `/taxonomy/:id`
- [ ] Fix `MethodologyManager.jsx` → migrare a `methodologiesApi` + store actions

## 🟡 Miglioramenti & Refactoring (Prossima settimana)
- [ ] Unificare doppio `module.exports` in `methodologyService.js`
- [ ] Disabilitare `stride-ai` nel manifest o creare i file mancanti (`taxonomy.json`, `prompts/extraction.md`)
- [ ] Aggiungere endpoint `/api/analysis/status` (se polling necessario) o rimuovere `getExtractionStatus` dal frontend
- [ ] Documentare editor codice Mermaid in `DfdEditor` come feature "view-only" o implementare sync bidirezionale

## 🧹 Cleanup & Documentazione
- [ ] Eliminare legacy: `backend/testServer.js`, `backend/advanced-assets.json`, `frontend/src/OLD_*.jsx`
- [ ] Aggiungere `backend/threat-model.json` a `.gitignore` (è dato runtime, non config)
- [ ] Aggiornare `PROJECT_CONTEXT.md` dopo ogni modifica architetturale significativa

🔧 Comandi Utili
```bash
# Backend
cd backend
npm test                 # 12 suite, 70 test → tutti passanti ✅
npm run docs:all         # Genera docs HTML in docs/backend/
npm start                # Server su porta 3001

# Frontend
cd frontend
npm run dev              # Vite su porta 5173
npm run build            # Build produzione
rm -rf node_modules/.vite && npm run dev  # Fix errori cache Vite

# Variabili
VITE_API_BASE=http://localhost:3001/api
```

📌 Note Tecniche Importanti
- **Estensioni**: `.js` per moduli/API/store, `.jsx` solo per componenti React con JSX.
- **Import relativi**: Da `src/components/` usare `../store/` e `../api/` (un solo `..`).
- **Store**: Non frammentare `useThreatModelStore`. Usare selector stabili con `useShallow`.
- **AppInitializer**: Montare una volta in `App.jsx`. Non renderizza UI, solo `useEffect` di inizializzazione.
- **API Layer**: Tutti i componenti devono usare i file in `src/api/`. Mai `fetch` o `axios` inline.
- **Backend JSON**: Asset e flussi condividono `threat-model.json`. Non esistono model separati.
- **Validazione**: `assetController` e `flowController` validano input e restituiscono HTTP 400 per errori di validazione, 500 per errori interni.
- **Cascade delete**: `assetService.deleteAsset()` rimuove automaticamente flussi orfani; il response include `orphanFlowsDeleted` per feedback.

📎 Riferimenti
| Risorsa | Percorso |
|---------|----------|
| Repository | https://github.com/nballestriero/threat-modeler |
| Contesto LLM | Questo file (`PROJECT_CONTEXT.md`) |
| Contesto Studenti | `docs/guides/STUDENT_CONTEXT.md` |
| Store Principale | `frontend/src/store/useThreatModelStore.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |
| Diagrammi Arch. | `docs/architecture/stores.md`, `docs/architecture/pipelines.md` |
| Manifesto Metodologie | `backend/methodologies/manifest.json` |
| API Layer Frontend | `frontend/src/api/` (assetsApi, flowsApi, configApi, taxonomyApi ✅) |
| Configurazione axios | `frontend/src/config/api.js` |

🔚 Fine del documento
Ultima verifica: 31 maggio 2025 | Versione: 6.3
Prossima revisione: al completamento di `methodologiesApi.js` e migrazione di `MethodologyManager`