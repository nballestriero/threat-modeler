PROJECT_CONTEXT.md – threat-modeler
Ultimo aggiornamento: 31 maggio 2025
Versione contesto: 6.0
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

🗂️ Mappa della Struttura File – Dove trovare cosa

## Backend (Node.js + Express)
```
backend/
├── routes/              # Endpoint HTTP (chiamano i controller)
│   ├── assets.js        # CRUD asset: GET/POST/PUT/DELETE /api/assets
│   ├── flows.js         # CRUD flussi: GET/POST/PUT/DELETE /api/flows
│   ├── config.js        # Configurazione globale: GET/PUT /api/config
│   ├── ollama.js        # Proxy Ollama: GET /api/ollama/models, POST /api/ollama/test
│   ├── rag.js           # Test RAG: POST /api/rag/test-connection
│   └── analysis.js      # Estrazione asset: POST /api/analysis/extract
│
├── controllers/         # Orchestrazione richieste, gestione errori
│   ├── assetController.js
│   ├── flowController.js
│   ├── configController.js
│   └── assetExtractionController.js
│
├── services/            # Logica di business pura (no HTTP, no DB diretto)
│   ├── AssetService.js      # CRUD asset su JSON
│   ├── FlowService.js       # CRUD flussi su JSON
│   ├── TextExtractorService.js  # PDF, MD, TXT, HTML → testo
│   ├── ChunkService.js        # Suddivisione testo con overlap
│   ├── RagService.js          # Bridge ChromaDB (Python o HTTP)
│   ├── OllamaService.js       # Chiamate a Ollama con timeout
│   ├── MethodologyService.js  # Gestione manifest, tassonomie, prompt
│   ├── AssetMergeService.js   # Deduplicazione per similarità trigrammi
│   └── assetExtractionPipeline.js # Orchestratore completo estrazione
│
├── models/              # I/O su file JSON (astrazione storage)
│   ├── assetModel.js
│   └── flowModel.js
│
├── methodologies/       # Definizione metodologie (manifest + tassonomie)
│   ├── manifest.json           # Lista metodologie supportate
│   ├── dfd-base/
│   │   ├── manifest.json       # Metadata metodologia
│   │   ├── taxonomy.json       # Categorie DFD con colori
│   │   └── prompt.md           # Template prompt per LLM
│   └── stride/ ...             # Stessa struttura per altre metodologie
│
├── utils/               # Helper trasversali
│   ├── configUtils.js       # Caricamento variabili d'ambiente
│   ├── errorHandler.js      # Middleware errori Express
│   └── fileUtils.js         # Operazioni su filesystem
│
├── data/                # Dati persistenti (JSON)
│   ├── assets.json
│   ├── flows.json
│   └── config.json
│
├── services/rag_bridge.py  # Script Python per ChromaDB client mode
├── server.js                 # Entry point Express
├── package.json
└── .env.example              # Variabili d'ambiente di esempio
```

## Frontend (React + Zustand + Vite)
```
frontend/
├── src/
│   ├── api/                 # Layer API centralizzato (axios wrapper)
│   │   ├── assetsApi.js     # CRUD asset: getAll(), create(), update(), delete()
│   │   ├── flowsApi.js      # CRUD flussi: getFlows(), createFlow(), updateFlow(), deleteFlow()
│   │   ├── configApi.js     # Configurazione: getConfig(), updateConfig(), test*()
│   │   ├── taxonomyApi.js   # Tassonomie: getDfdTaxonomy(), getAllTaxonomies()
│   │   └── analysisApi.js   # Estrazione: startExtraction(), getExtractionStatus()
│   │
│   ├── store/               # Store Zustand (gestione stato globale)
│   │   ├── useThreatModelStore.js  # Store monolitico: asset + flussi + flag
│   │   ├── useAppStore.js          # Navigazione: currentPhase, sidebar
│   │   └── useAnalysisStore.js     # Stato transitorio estrazione LLM
│   │
│   ├── components/          # Componenti React (UI)
│   │   ├── App.jsx                   # Root component, monta AppInitializer
│   │   ├── AppInitializer.jsx        # Carica dati all'avvio (una volta sola)
│   │   ├── Sidebar.jsx               # Navigazione laterale tra fasi
│   │   ├── ConfigPanel.jsx           # Configurazione a tab (LLM, RAG, DB, Progetto)
│   │   ├── DocumentationManager.jsx  # Fase 1: caricamento documenti, estrazione
│   │   ├── BaseAssetsManager.jsx     # Fase 2: gestione asset base (CRUD + AI)
│   │   ├── DfdEditor.jsx             # Fase 3: diagramma Mermaid + flussi
│   │   ├── MethodologyManager.jsx    # Fase 4: applicazione metodologie
│   │   └── MethodologyDfdView.jsx    # Fase 5: visualizzazione DFD avanzato
│   │
│   ├── config/              # Configurazione frontend
│   │   └── api.js           # Istanza axios preconfigurata (baseURL, timeout, interceptor)
│   │
│   └── index.jsx            # Entry point React
│
├── public/                  # Asset statici
├── index.html               # Template HTML per Vite
├── vite.config.js           # Configurazione build/dev
├── package.json
└── .env.example             # Variabili d'ambiente frontend (VITE_API_BASE)
```

## Documentazione
```
docs/
├── architecture/
│   ├── stores.md           # Diagrammi Mermaid: store → componenti → API → backend
│   ├── pipelines.md        # Flusso estrazione asset: documenti → chunking → RAG → LLM
│   └── components.md       # Mappa componenti React + dipendenze
├── api/
│   ├── backend-openapi.yaml    # Specifica OpenAPI/Swagger (da generare)
│   └── frontend-api-layer.md   # Documentazione assetsApi, configApi, ecc.
├── guides/
│   ├── STUDENT_CONTEXT.md      # Materiale didattico per studenti (pattern, esercizi, debugging)
│   ├── adding-a-store.md       # Come aggiungere un nuovo store Zustand
│   ├── migrating-component.md  # Checklist migrazione componente a store monolitico
│   └── testing-frontend.md     # Setup Jest + React Testing Library
├── backend/                # Generata automaticamente con `npm run docs:all`
│   ├── index.html
│   └── *.md
└── README.md               # Indice con link a tutte le sezioni
```

🧠 Architettura realizzata (al 31 maggio 2025)

## Backend (Node.js + Express)
Layered architecture consolidata:

| Layer | Ruolo | Esempio |
|-------|-------|---------|
| Routes | Gestione HTTP (chiamano controller) | `assets.js`, `flows.js`, `config.js` |
| Controllers | Orchestrazione, gestione errori | `assetController.js`, `configController.js` |
| Services | Logica di business pura | `AssetService.js`, `RagService.js`, `assetExtractionPipeline.js` |
| Models | I/O su file JSON | `assetModel.js`, `flowModel.js` |
| Utils | Helper (config, errorHandler, file) | `configUtils.js`, `errorHandler.js` |

Servizi principali implementati:
- `TextExtractorService` – Estrazione testo da PDF, Markdown, TXT, HTML
- `ChunkService` – Suddivisione testo con overlap configurabile
- `OllamaService` – Chiamate a Ollama con timeout (120s) e gestione errori
- `RagService` – Bridge verso ChromaDB (modalità HTTP server o client Python)
- `MethodologyService` – Gestione manifest, tassonomie, prompt per metodologie
- `AssetMergeService` – Deduplicazione asset per similarità trigrammi
- `assetExtractionPipeline` – Orchestratore completo: estrai → chunka → RAG → LLM → merge
- `AssetService`, `FlowService` – CRUD asset e flussi su JSON

RAG e metodologie:
- Ogni metodologia ha una collezione ChromaDB dedicata (`methodology_{id}`).
- All'avvio (se RAG abilitato) viene indicizzata automaticamente la tassonomia della metodologia (un documento per categoria).
- Durante l'estrazione, la pipeline arricchisce la query RAG con i nomi delle categorie.
- L'utente può caricare file di contesto che vengono indicizzati nella stessa collezione.

Test:
- ✅ 12 suite, 53 test → tutti passanti.
- ✅ Test di integrazione con ChromaDB reale e con mock di Ollama.

## Frontend (React + Zustand + Vite)
Architettura unidirectional data flow:
```
UI components → Zustand store → API calls → Backend → Aggiornamento store → UI re-render
```

API layer – `src/api/` (`assetsApi`, `taxonomyApi`, `configApi`, `analysisApi`, `flowsApi`)
Config – `src/config/api.js` (istanza axios con `VITE_API_BASE`, timeout 120s, interceptor errori)

## Store Zustand – architettura consolidata (espansa)

### Store attivi e responsabilità

| Store | File | Responsabilità | Componenti che lo usano |
|-------|------|---------------|------------------------|
| ✅ `useThreatModelStore` | `src/store/useThreatModelStore.js` | **Unica fonte di verità** per asset e flussi. Gestisce CRUD, flag `assetsLoaded`/`flowsLoaded`, cleanup orphan flows, sincronizzazione con backend via `assetsApi`/`flowsApi`. | `BaseAssetsManager`, `DfdEditor`, `DocumentationManager`, `AppInitializer` |
| ✅ `useAppStore` | `src/store/useAppStore.js` | Gestione navigazione: `currentPhase` (1-5), stato sidebar mobile. | `Sidebar`, `App` |
| ✅ `useAnalysisStore` | `src/store/useAnalysisStore.js` | Stato transitorio estrazione asset (Fase 1): progresso, chunk elaborati, errori LLM temporanei. Isolato per non inquinare lo store principale. | `DocumentationManager` (solo durante estrazione) |

### Store eliminati
| Store | File | Motivazione | Data |
|-------|------|-------------|------|
| ❌ `useAssetStore` | `src/store/useAssetStore.js` | Ridondante: duplicava `useThreatModelStore`. Rischio desincronizzazione asset/flows. Tutti i componenti migrati. | 31/05/2025 |

### Principi architetturali store (dettagliati)

#### 1. Store monolitico per dati correlati
Asset e flussi sono entità strettamente accoppiate: un flusso collega due asset. Mantenere nello stesso store garantisce:
- **Aggiornamenti atomici**: es. `deleteAsset(id)` rimuove l'asset E tutti i flussi con `fromId===id` o `toId===id` in un'unica operazione `set()`.
- **Nessuna sincronizzazione manuale**: non serve coordinare due store separati.
- **Sottoscrizioni React semplificate**: un componente sottoscrive una volta a `useThreatModelStore` e riceve sia asset che flussi.

#### 2. Selector stabili per prevenire infinite re-render
Zustand confronta i risultati dei selector con `Object.is`. Creare oggetti inline ad ogni render causa re-render infiniti.

```javascript
// ✅ CORRETTO: ogni hook restituisce un riferimento stabile (primitivo o funzione memoizzata)
const assets = useThreatModelStore(state => state.assets);
const deleteAsset = useThreatModelStore(state => state.deleteAsset);

// ✅ ALTERNATIVA SICURA: usa useShallow per aggregare più valori
import { useShallow } from 'zustand/shallow';
const { assets, deleteAsset } = useThreatModelStore(
  useShallow(state => ({ assets: state.assets, deleteAsset: state.deleteAsset }))
);

// ❌ DA EVITARE: crea un NUOVO oggetto ad ogni render → infinite loop
const { assets, deleteAsset } = useThreatModelStore(state => ({
  assets: state.assets,
  deleteAsset: state.deleteAsset
}));
```

#### 3. Inizializzazione centralizzata con `AppInitializer`
Per evitare che ogni componente faccia `fetch()` all'avvio (concorrenza, dati duplicati, UI vuota):

```jsx
// frontend/src/components/AppInitializer.jsx
import { useEffect } from 'react';
import { useThreatModelStore } from '../store/useThreatModelStore';

export default function AppInitializer({ children }) {
  const { fetchAssets, fetchFlows, assetsLoaded, flowsLoaded } = useThreatModelStore();
  
  useEffect(() => {
    if (!assetsLoaded) fetchAssets();
    if (!flowsLoaded) fetchFlows();
  }, [fetchAssets, fetchFlows, assetsLoaded, flowsLoaded]);

  return <>{children}</>;
}
```

Montato una volta in `App.jsx`:
```jsx
// frontend/src/components/App.jsx
import AppInitializer from './components/AppInitializer';

function App() {
  return (
    <AppInitializer>  {/* ← Wrappa tutta l'UI */}
      {/* Sidebar, header, fasi... */}
    </AppInitializer>
  );
}
```

#### 4. Flag di caricamento per prevenire fetch duplicati
Ogni azione di fetch controlla i flag prima di eseguire:
```javascript
fetchAssets: async () => {
  const { assetsLoaded, loading } = get();
  if (assetsLoaded || loading) return; // ← Previene chiamate ridondanti
  // ... esegui fetch
}
```

### Diagrammi architetturali (Mermaid)
- [Store & Componenti](docs/architecture/stores.md): Flusso dati store → componenti → API → backend
- [Pipeline Estrazione](docs/architecture/pipelines.md): Documenti → chunking → RAG → LLM → store

🎓 Risorse per studenti e nuovi sviluppatori

## Guida didattica: `docs/guides/STUDENT_CONTEXT.md`
Questo documento accompagna gli studenti nell'apprendimento pratico attraverso il progetto. Include:
- Spiegazione passo-passo dell'architettura client-server
- Pattern fondamentali (API layer, Zustand selectors, JSDoc)
- Esercizi progressivi (da "aggiungi un campo" a "migra un componente")
- Guida al debugging professionale con DevTools e console
- Setup ambiente di sviluppo e workflow Git base

> 💡 **Consiglio per docenti**: Incoraggiate gli studenti a fare Pull Request con correzioni o nuovi esercizi a `STUDENT_CONTEXT.md`. Il learning by teaching è il metodo più efficace.

## Come usare questo progetto per imparare
1. **Inizia dai file piccoli**: `configApi.js`, `useAppStore.js` sono semplici e ben documentati.
2. **Traccia una chiamata API**: Usa DevTools → Network tab per seguire il flusso frontend → backend.
3. **Modifica e osserva**: Aggiungi un `console.log` in uno store, poi usa l'UI per triggerare l'azione.
4. **Leggi i JSDoc**: Ogni funzione esportata ha documentazione; genera HTML con `npm run docs:all` nel backend.
5. **Fai un esercizio**: Scegli un task da `STUDENT_CONTEXT.md` e completalo in un branch separato.

🔍 Istruzioni per LLM: Come leggere il repository Git

## Metodo consigliato per accedere ai file
Quando devi analizzare o modificare codice nel repository `https://github.com/nballestriero/threat-modeler`, usa il pattern **raw content URL** per ottenere il contenuto puro del file senza HTML:

```
https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}
```

### Esempi pratici
| File desiderato | URL raw da usare |
|----------------|------------------|
| `frontend/src/store/useThreatModelStore.js` | `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/frontend/src/store/useThreatModelStore.js` |
| `backend/services/ragService.js` | `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/backend/services/ragService.js` |
| `docs/architecture/stores.md` | `https://raw.githubusercontent.com/nballestriero/threat-modeler/master/docs/architecture/stores.md` |

### Perché usare raw URL?
- ✅ Restituisce il contenuto del file in plain text (no HTML, no UI GitHub)
- ✅ Compatibile con tool di fetch/axios/script di automazione
- ✅ Permette di parsare il codice direttamente senza stripping di markup

### Strumenti consigliati
- **Per fetch manuale**: Usa `curl` o `wget` sull'URL raw
- **Per automazione**: Script Python/Node con `fetch()` o `axios.get()`
- **Per esplorazione**: Estensioni VS Code come "GitHub Raw" o "Open in Raw"

### Fallback: API GitHub v3
Se hai bisogno di metadata (commit history, blame, ecc.), usa l'API REST:
```
GET https://api.github.com/repos/nballestriero/threat-modeler/contents/{path}?ref=master
```
La risposta include `download_url` (che punta al raw content) e `content` (base64-encoded).

> ⚠️ **Nota**: Il branch predefinito è `master`. Se lavori su un feature branch, sostituisci `master` con il nome del branch nell'URL.

📚 Strategia documentazione (aggiornata)

## Come mantenere la documentazione sincronizzata
1. **Diagrammi Mermaid**: Scritti in `.md` dentro `docs/architecture/`. Renderizzabili nativamente su GitHub e VS Code (estensione "Mermaid Preview").
2. **JSDoc obbligatorio**: Ogni funzione pubblica in backend/frontend deve avere commento con `@module`, `@param`, `@returns`.
3. **Generazione automatica**:
   - Backend: `cd backend && npm run docs:all` → genera HTML in `docs/backend/`
   - Frontend: Configurare `jsdoc` o `typedoc` per `src/api/` e `src/store/` (task futuro)
4. **Checklist pre-merge**:
   - [ ] `PROJECT_CONTEXT.md` aggiornato con modifiche architetturali?
   - [ ] Diagrammi in `docs/architecture/` allineati al codice?
   - [ ] Nuove API documentate in OpenAPI o Markdown?
   - [ ] Nuovi componenti hanno JSDoc nell'header?

## Automazione futura (opzionale)
GitHub Action che su `push` a `main`:
1. Esegue `npm run docs:all` nel backend
2. Commit automatico dei file generati in `docs/`
3. Verifica che `PROJECT_CONTEXT.md` contenga la keyword `@updated` (fallback: notifica maintainer)

🚧 Passi mancanti (priorità aggiornata)

## Frontend (immediati)
- [x] Migrare `ConfigPanel.jsx` a `configApi` ✅ Completato
- [x] Creare `flowsApi.js` per `DfdEditor` ✅ Completato
- [ ] Creare `methodologiesApi.js` per `MethodologyManager` (priorità: media)

## Backend (miglioramenti)
- [ ] Aggiungere validazione input con Zod sugli endpoint critici (`/assets`, `/flows`, `/config`)
- [ ] Supporto a ulteriori formati documento (DOCX, ODT) in `TextExtractorService`
- [ ] Generazione report automatico (PDF/HTML) da template EJS/Pug

## Cleanup (priorità bassa)
- [ ] Eliminare file legacy:
  - `backend/OLD_2_server.js`, `backend/OLD_server.js`, `backend/testServer.js`
  - `backend/advanced-assets.json`
  - `frontend/src/OLDApp.jsx`, `frontend/src/components/OLD_*.jsx`

## Generali
- [ ] Configurare test frontend (Jest + React Testing Library)
- [ ] Impostare GitHub Actions per esecuzione automatica test su PR
- [ ] Completare documentazione API con OpenAPI/Swagger (generazione da JSDoc)

🔧 Comandi utili
```bash
# Backend
cd backend
npm test                 # esegue tutti i test (12 suite, 53 test)
npm run docs:all         # genera HTML (docs/backend) + Markdown per LLM
npm start                # avvia server Express (porta 3001)

# Frontend
cd frontend
npm run dev              # avvia Vite dev server (porta 5173)
npm run build            # build produzione (output in dist/)
rm -rf node_modules/.vite && npm run dev  # pulizia cache Vite se errori di import

# Variabili d'ambiente
# Backend: copia .env.example e modifica se necessario
cp backend/.env.example backend/.env
# Frontend: VITE_API_BASE punta al backend locale
VITE_API_BASE=http://localhost:3001/api
```

📌 Note tecniche importanti

### Estensione dei file JavaScript
- Nel frontend, Vite tratta `.js` e `.jsx` come equivalenti.
- **Convenzione adottata**: `.js` per moduli senza JSX (API, store, config), `.jsx` solo per componenti React che contengono JSX.
- Esempio: `taxonomyApi.js` è `.js` (nessun JSX), `ConfigPanel.jsx` è `.jsx` (contiene JSX).

### Percorsi relativi negli import
- Componenti in `src/components/` importano store e API con:
  ```javascript
  import { useThreatModelStore } from '../store/useThreatModelStore'; // un solo ..
  import { assetsApi } from '../api/assetsApi';
  ```
- Non usare `../../` se non per accedere a livelli superiori a `src/`.

### Cache di Vite
- In caso di errori di import dopo modifiche strutturali:
  ```bash
  rm -rf frontend/node_modules/.vite && cd frontend && npm run dev
  ```

### Store monolitico
- `useThreatModelStore` gestisce sia asset che flussi: non frammentare senza una motivazione architetturale forte (es. performance critiche con dataset enormi).

### AppInitializer
- Deve essere montato **una volta sola** in `App.jsx`, prima del rendering delle fasi.
- Non renderizza UI visibile: esegue solo `useEffect` per popolare lo store.
- Separare l'inizializzazione dal store segue il principio di separazione delle responsabilità.

### Selector Zustand stabili (richiamo)
- Usa sempre selector che restituiscono valori primitivi o riferimenti stabili.
- Per aggregare più valori, preferisci `useShallow` da `zustand/shallow` invece di oggetti inline.

📎 Riferimenti rapidi
| Risorsa | Link / Percorso |
|---------|----------------|
| Repository GitHub | https://github.com/nballestriero/threat-modeler |
| Documentazione backend (generata) | `docs/backend/index.html` |
| Contesto per LLM | Questo file (`PROJECT_CONTEXT.md`) |
| Contesto per studenti | `docs/guides/STUDENT_CONTEXT.md` |
| Script RAG Python | `backend/services/rag_bridge.py` |
| Manifesto metodologie | `backend/methodologies/manifest.json` |
| Store principale | `frontend/src/store/useThreatModelStore.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |
| Architettura store (diagramma) | `docs/architecture/stores.md` |
| Pipeline AI (diagramma) | `docs/architecture/pipelines.md` |
| API layer frontend | `frontend/src/api/` |
| Configurazione axios | `frontend/src/config/api.js` |

🔚 Fine del documento
Ultima verifica: 31 maggio 2025
Versione: 6.0
Prossima revisione: al completamento di `methodologiesApi.js` e configurazione test frontend