PROJECT_CONTEXT.md – threat-modeler
Ultimo aggiornamento: 31 maggio 2025
Versione contesto: 6.1
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
│   ├── assets.js        # CRUD asset E flussi (gestiti insieme nel modello JSON)
│   ├── config.js        # GET/PUT configurazione globale (logica inline)
│   ├── ollama.js        # GET /api/ollama/models, POST /api/ollama/test
│   ├── rag.js           # POST /api/rag/test-connection
│   ├── analysis.js      # POST /api/analysis/extract (sincrono, NO endpoint /status)
│   ├── taxonomy.js      # GET /api/dfd-taxonomy (legge da backend/context/)
│   └── methodologies.js # ❌ MANCANTE (richiesto per Fase 4)
├── controllers/
│   └── assetExtractionController.js  # Estrazione asset (sincrona)
├── services/
│   ├── assetService.js      # CRUD su JSON (gestisce anche flussi)
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
│   │   ├── flowsApi.js      # ✅ Creato ma ⚠️ NON INTEGRATO (store e componenti usano api diretto)
│   │   ├── configApi.js     # ✅ Completo (getConfig, updateConfig, test* functions)
│   │   ├── analysisApi.js   # ✅ Presente (startExtraction, getExtractionStatus ⚠️ endpoint backend mancante)
│   │   └── taxonomyApi.js   # ❌ MANCANTE (blocca BaseAssetsManager Fase 2)
│   ├── store/
│   │   ├── useThreatModelStore.js  # ✅ Monolitico per asset+flows, ma ⚠️ MANCANO azioni CRUD flussi
│   │   ├── useAppStore.js          # ✅ Navigazione (currentPhase, setPhase)
│   │   └── useAnalysisStore.js     # ✅ Stato transitorio estrazione
│   ├── components/
│   │   ├── App.jsx                 # ✅ Root, monta AppInitializer
│   │   ├── AppInitializer.jsx      # ✅ Fetch iniziale centralizzato
│   │   ├── ConfigPanel.jsx         # ✅ Migrato, UI a tab, usa configApi + apiClient per test
│   │   ├── BaseAssetsManager.jsx   # ✅ Migrato, selector stabili, ma ⚠️ importa taxonomyApi mancante
│   │   ├── DfdEditor.jsx           # ⚠️ Parziale: visualizza OK, ma manipolazione flussi bypassa store (usa api diretto + stato locale)
│   │   ├── DocumentationManager.jsx# ✅ Migrato
│   │   └── MethodologyManager.jsx  # ❌ Non migrato, chiama setActiveMethodology inesistente, endpoint backend mancanti
│   └── config/api.js        # ✅ Istanza axios (VITE_API_BASE=3001, timeout 120s, interceptor errori)
└── docs/
    ├── architecture/        # stores.md, pipelines.md (Mermaid)
    ├── guides/              # STUDENT_CONTEXT.md (materiale didattico)
    └── backend/             # Generata con npm run docs:all
```

🧠 Architettura Realizzata – Stato Attuale

## Backend (Node.js + Express)
- **Modello dati unico**: Asset e flussi sono gestiti nello stesso file JSON (`threat-model.json`) tramite `assetModel.js`. Non esistono `flowModel.js` o `FlowService` separati (la documentazione precedente era imprecisa).
- **Estrazione asset sincrona**: L'endpoint `POST /api/analysis/extract` elabora l'intera pipeline in una singola richiesta HTTP. Può causare timeout per documenti lunghi. Non esiste endpoint `/status` per polling.
- **RAG**: Ogni metodologia ha collezione ChromaDB dedicata (`methodology_{id}`). Tassonomia indicizzata all'avvio. Query RAG arricchita con nomi categorie.
- **Test**: 12 suite, 53 test → tutti passanti.

## Frontend (React + Zustand + Vite)
- **Flusso dati ideale**: `UI → Zustand store → API Layer → Backend → Store update → UI re-render`
- **Stato reale**: Alcuni componenti (`DfdEditor`, `MethodologyManager`) bypassano lo store e chiamano API direttamente, creando desincronizzazione potenziale.
- **API Layer**: `src/api/*.js` centralizzano chiamate HTTP. Usano `apiClient` da `src/config/api.js` (respecta `VITE_API_BASE`, timeout, interceptor errori).

## Store Zustand – Stato e Limitazioni Attuali

### Cosa funziona ✅
- `useThreatModelStore` è l'unica fonte di verità per asset e flussi.
- Azioni CRUD asset complete: `fetchAssets`, `addAsset`, `updateAsset`, `deleteAsset` (con cleanup locale flussi orfani).
- Flag `assetsLoaded`/`flowsLoaded` prevengono fetch duplicati.
- Selector stabili usati nei componenti migrati (`BaseAssetsManager`).

### Cosa manca / è incoerente ⚠️
| Funzionalità | Stato | Impatto |
|-------------|-------|---------|
| Azioni CRUD flussi nello store (`addFlow`, `updateFlow`, `deleteFlow`) | ❌ Mancanti | Componenti non possono manipolare flussi tramite store → violano architettura unidirezionale |
| Cascade delete backend per flussi orfani | ❌ Non implementato | Cancellando un asset, i flussi correlati rimangono in `flows.json` → accumulo dati inconsistenti |
| Integrazione `flowsApi.js` | ⚠️ File creato ma non usato | Store e componenti usano ancora `api` diretto per flussi |

### Principi da rispettare (quando si aggiungono funzionalità)
1. **Store monolitico**: Asset e flussi vivono insieme. Aggiornamenti atomici.
2. **Selector stabili**: Usare hook separati o `useShallow` da `zustand/shallow`.
3. **Layer API dedicato**: Store e componenti chiamano `assetsApi.*`, `flowsApi.*`, non `axios` diretto.
4. **Inizializzazione centralizzata**: `<AppInitializer />` monta una volta in `App.jsx`.

⚠️ Known Issues & Bug Report (Aggiornato 31/05/2025)

## 🔴 Critici (Bloccanti / Errori Runtime)
| File | Problema | Impatto | Azione Richiesta |
|------|----------|---------|------------------|
| `frontend/src/api/taxonomyApi.js` | File mancante (404) | `BaseAssetsManager.jsx` crasha all'import. Fase 2 inutilizzabile. | ✅ Creare subito con `getDfdTaxonomy()`, `getAllTaxonomies()` |
| `backend/services/assetService.js` | `importAssets` restituisce `{ imported: N }` | Controller destruttura `{ saved, duplicates }` → risposta HTTP contiene `undefined`. | Allineare return service con controller |
| `frontend/src/components/MethodologyManager.jsx` | Chiama `setActiveMethodology()` inesistente | `useAppStore` non esporta questa funzione → errore runtime. | Sostituire con `setPhase()` o migrare componente |
| `backend/routes/methodologies.js` | Endpoint mancanti | `taxonomyApi.getAllTaxonomies()` → 404. Fase 4 non funziona. | Creare route con endpoint per lista metodologie e tassonomie |
| `backend/controllers/assetController.js` | Delete asset non elimina flussi correlati | Flussi orfani persistono in `flows.json` → incoerenza dati. | Implementare cascade delete o gestire nel frontend con chiamate multiple |

## 🟡 Warning / Fragilità Architetturali
| File | Problema | Impatto | Azione |
|------|----------|---------|--------|
| `frontend/src/store/useThreatModelStore.js` | Mancano azioni `addFlow`/`updateFlow`/`deleteFlow` | `DfdEditor` bypassa store, usa API dirette → desincronizzazione potenziale. | Aggiungere azioni flussi allo store, usare `flowsApi` |
| `frontend/src/components/DfdEditor.jsx` | Stato locale `flows` + chiamate `api` dirette | Violazione pattern unidirezionale. Modifiche non propagate ad altri componenti. | Refactor: usare store actions, rimuovere stato locale |
| `backend/services/methodologyService.js` | Doppio `module.exports` consecutivo | Fragile, tool di analisi statica confusi. | Unificare in un unico export object |
| `backend/methodologies/stride-ai/` | Manca `taxonomy.json` e `prompts/extraction.md` | Server tenta indicizzazione RAG → warning. | Disabilitare in `manifest.json` o creare file |
| `frontend/src/api/analysisApi.js` | `getExtractionStatus()` chiama endpoint inesistente | 404 se usato per polling. | Implementare endpoint backend OPPURE rimuovere funzione |

## 📝 Incoerenze Documentazione vs Codice Reale
- `backend/routes/flows.js`, `backend/models/flowModel.js`: **non esistono**. Flussi gestiti in `assets.js` e `assetModel.js`. (Docs da correggere)
- `backend/controllers/configController.js`: **non esiste**. Logica in `routes/config.js`. (Docs da correggere)
- `AssetService.js` (docs PascalCase) vs `assetService.js` (reale camelCase): mismatch case. Su Linux può rompere import. (Docs da correggere)
- `flowsApi.js` dichiarato "integrato" ma store/componenti usano ancora `api` diretto. (Docs da aggiornare: "Creato, in corso di integrazione")

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

## 🔴 Immediati (Bloccanti – Risolvere questa settimana)
- [ ] Creare `frontend/src/api/taxonomyApi.js` (export: `getDfdTaxonomy`, `getAllTaxonomies`)
- [ ] Fix mismatch `assetService.js` ↔ `assetExtractionController.js` (`saved`/`duplicates` undefined)
- [ ] Fix `MethodologyManager.jsx` → sostituire `setActiveMethodology` con `setPhase` o migrare
- [ ] Creare `backend/routes/methodologies.js` con endpoint `/` e `/taxonomy/:id`
- [ ] Aggiungere azioni flussi a `useThreatModelStore.js`: `addFlow`, `updateFlow`, `deleteFlow` (usando `flowsApi`)
- [ ] Refactor `DfdEditor.jsx` → usare store actions invece di `api` diretto, rimuovere stato locale `flows`

## 🟡 Miglioramenti & Refactoring (Prossima settimana)
- [ ] Implementare cascade delete backend: quando si cancella un asset, eliminare anche flussi con `fromId`/`toId` corrispondenti
- [ ] Unificare doppio `module.exports` in `methodologyService.js`
- [ ] Disabilitare `stride-ai` nel manifest o creare i file mancanti (`taxonomy.json`, `prompts/extraction.md`)
- [ ] Aggiungere endpoint `/api/analysis/status` (se polling necessario) o rimuovere `getExtractionStatus` dal frontend
- [ ] Validazione input base su `POST /assets` e `POST /flows` (`if (!name) return 400`)

## 🧹 Cleanup & Documentazione
- [ ] Eliminare legacy: `backend/testServer.js`, `backend/advanced-assets.json`, `frontend/src/OLD_*.jsx`
- [ ] Aggiungere `backend/threat-model.json` a `.gitignore` (è dato runtime, non config)
- [ ] Rimuovere import inutilizzati (`useShallow` in `DfdEditor.jsx`)
- [ ] Aggiornare `PROJECT_CONTEXT.md` dopo ogni modifica architetturale significativa

🔧 Comandi Utili
```bash
# Backend
cd backend
npm test                 # 12 suite, 53 test
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
- **Store**: Non frammentare `useThreatModelStore`. Usare selector stabili o `useShallow`.
- **AppInitializer**: Montare una volta in `App.jsx`. Non renderizza UI, solo `useEffect` di inizializzazione.
- **API Layer**: Tutti i componenti devono usare i file in `src/api/`. Mai `fetch` o `axios` inline.
- **Backend JSON**: Asset e flussi condividono `threat-model.json`. Non esistono model separati.

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
| API Layer Frontend | `frontend/src/api/` |
| Configurazione axios | `frontend/src/config/api.js` |

🔚 Fine del documento
Ultima verifica: 31 maggio 2025 | Versione: 6.1
Prossima revisione: al completamento dei fix critici (taxonomyApi, azioni flussi store, cascade delete backend)