# PROJECT_CONTEXT.md – threat-modeler

**Ultimo aggiornamento:** 29 maggio 2025  
**Versione contesto:** 3.0  
**Manutenuto da:** *(da compilare)*

> 🤖 **Istruzione per LLM:** Se stai leggendo questo file, assumi che rappresenti fedelmente lo stato attuale del progetto. Usalo per contestualizzare le tue risposte. Tutte le convenzioni descritte qui devono essere rispettate nel codice che suggerisci. Non generare codice che violi i pattern documentati.

---

## 📌 Manutenzione di questo file

**Regola fondamentale:** ogni volta che si modifica l'architettura, si aggiunge un pattern, si completa un passo della lista o si cambia un comando, questo file va aggiornato.

**Serve come:**
- Contesto per LLM (forniscilo all'inizio di ogni sessione di assistenza)
- Onboarding per nuovi sviluppatori
- Memoria storica delle decisioni tecniche

> ⚠️ Non esiste generazione automatica – è scritto e mantenuto manualmente.

---

## 1. Pattern di sviluppo

### Backend (Node.js + Express)
**Layered architecture** (non MVC classico, ma separazione chiara):

| Layer | Ruolo | Esempio |
|-------|-------|---------|
| **Routes** | Gestione HTTP (richiesta/risposta) | `routes/assets.js` |
| **Controllers** | Orchestrano i service, gestiscono errori, formattano risposta | `controllers/assetController.js` |
| **Services** | Logica di business pura (no req/res) | `services/assetService.js` |
| **Models** | I/O su file JSON (lettura/scrittura persistenza) | `models/assetModel.js` |
| **Utils** | Helper puri (file, stringhe, chiamate esterne) | `utils/errorHandler.js` |

**Flusso:**  
`route` → `controller` → `service` → `model` → `service` → `controller` → `route` → risposta

### Frontend (React + Zustand)
**Unidirectional Data Flow** (Flux pattern):

- **Components:** solo UI, dispatchano azioni tramite store o props
- **Store (Zustand):** stato globale e azioni (business logic frontend)
- **API layer:** chiamate HTTP centralizzate (`src/api/*.js`)
- **Config:** istanza axios con base URL variabile d'ambiente

**Flusso:**  
`component` → `store action` → `api` → (HTTP) → backend → `store update` → componente rerender

---

## 2. Documentazione

### Per umani (HTML navigabile)
| Caratteristica | Dettaglio |
|---------------|-----------|
| **Strumento** | JSDoc + tema docdash |
| **Generazione** | `npm run docs` in `backend/` e `frontend/` |
| **Output** | `docs/backend/index.html` e `docs/frontend/index.html` |
| **Contenuto** | Commenti JSDoc di tutte le funzioni pubbliche (parametri, return, esempi) |

### Per LLM (Markdown leggibile)
| Caratteristica | Dettaglio |
|---------------|-----------|
| **Strumento** | jsdoc-to-markdown |
| **Generazione** | `npm run docs:md` (backend) → produce `docs/backend/api.md` |
| **Contenuto** | Stesso dei commenti JSDoc, ma in formato markdown puro, ideale per essere passato come contesto a un LLM |

### Regole di scrittura JSDoc (obbligatorie per tutte le funzioni pubbliche)
```javascript
/**
 * Breve descrizione
 * @param {string} param - Descrizione
 * @returns {Promise<Array>} Descrizione
 * @throws {Error} Se ...
 * @example
 * const result = await myFunction('test');
 */
```

### Perché documentare in questo modo?
- ✅ **Automatico:** nessuna documentazione manuale separata
- ✅ **Sempre aggiornata:** rigeneri quando il codice cambia
- ✅ **Doppio formato:** HTML per navigazione interattiva, Markdown per LLM
- ✅ **Integrabile in CI:** si può generare la documentazione a ogni push

---

## 3. Test

### Framework
- **Jest:** test runner, asserzioni
- **Supertest:** test HTTP per Express

### Struttura dei test
```
backend/tests/
├── unit/            # Test unitari (servizi, modelli, utility)
│   ├── assetService.test.js
│   ├── flowService.test.js
│   ├── textExtractorService.test.js
│   ├── ragService.test.js
│   ├── methodologyService.test.js
│   ├── assetMergeService.test.js
│   └── assetExtractionPipeline.test.js
├── integration/     # Test di integrazione (route + controller)
│   ├── assets.integration.test.js
│   └── server.integration.test.js
└── helpers/         # Setup, mock, utility
    └── setup.js     (opzionale)
```

### Esecuzione dei test (comandi)
```bash
cd backend

# Esegui tutti i test una volta
npm test

# Esegui in modalità watch (riesegue automaticamente i test salvati)
npm run test:watch

# Esegui test con report di copertura (genera cartella coverage/)
npm run test:coverage

# Esegui test per un singolo file
npm test -- --testPathPatterns=assetExtractionPipeline
```

### Perché test automatici?
- 🔁 **Regressione:** le modifiche non rompono funzionalità esistenti
- 🛡️ **Refactoring sicuro:** abbiamo già iniziato a migrare verso layered architecture
- 📚 **Documentazione eseguibile:** i test mostrano come usare le API
- 🚀 **CI/CD:** possono essere eseguiti in pipeline prima del deploy

### Stato attuale dei test
| Feature | Stato |
|---------|-------|
| ✅ Asset CRUD | test unitari e di integrazione passano |
| ✅ Flussi (flows) | test unitari e di integrazione passano |
| ✅ Pipeline estrazione asset | test unitari e di integrazione passano |
| ✅ Server e route | test di integrazione passano |

---

## 4. Passi fatti (dal 29 maggio 2025)

- ✅ Pulizia file morti (`OLD_`, test, boilerplate, PDF)
- ✅ Rimosso `backend/config.json` dal tracking git (sicurezza)
- ✅ Centralizzata `API_BASE` nel frontend (`config/api.js`)
- ✅ Eliminato `ragIndexer.js` (inutilizzato e buggato)
- ✅ Configurato JSDoc + docdash per backend e frontend
- ✅ Installato `jsdoc-to-markdown` per generare Markdown per LLM
- ✅ Creata struttura layered per gli **assets**:
  - `models/assetModel.js`
  - `services/assetService.js`
  - `controllers/assetController.js`
  - `routes/assets.js` (thin router)
- ✅ Scritti test unitari e di integrazione per asset CRUD (passano)
- ✅ Configurato Jest con Babel per supportare ES modules (`uuid`)
- ✅ Modificato `server.js` per esportare `app` e permettere test con supertest
- ✅ Generata documentazione HTML e Markdown per il backend
- ✅ Migrata gestione dei **flussi (flows)** con stessa struttura layered:
  - `services/flowService.js`
  - `controllers/flowController.js`
  - Route integrate in `routes/assets.js`
  - Test unitari e di integrazione (passano)
- ✅ **Implementata e testata nuova pipeline di estrazione asset:**
  - Servizi implementati: `TextExtractorService`, `ChunkService`, `OllamaService`, `RagService`, `MethodologyService`, `AssetMergeService`
  - Orchestratore: `AssetExtractionPipeline`
  - Controller: `assetExtractionController.js`
  - Route: `POST /api/analyze/extract-assets`
  - Supporto a PDF, Markdown, TXT, HTML
  - RAG in due modalità (`http-server` e `python-client`)
  - Metodologie gestite via manifesto `methodologies/manifest.json`
  - Test unitari e di integrazione superati
- ✅ Aggiornato `server.js` con configurazione in `app.locals` e documentazione JSDoc
- ✅ Aggiornato `PROJECT_CONTEXT.md` alla versione 3.0

---

## 5. Passi mancanti (priorità)

### Backend
- [ ] Migrare enrichment e advanced assets verso nuova architettura (opzionale, legacy)
- [ ] Aggiungere validazione input con **Zod** (già installato)
- [ ] Aggiungere middleware di errore centralizzato (già in `utils/errorHandler.js`, da integrare)
- [ ] Supporto a ulteriori formati (DOCX, ODT) in `TextExtractorService`

### Frontend
- [ ] Creare API layer per tutti i domini (assets, flows, analysis, rag, config)
- [ ] Separare store Zustand per dominio (`useAssetStore`, `useAnalysisStore`)
- [ ] Rimuovere axios diretto dai componenti
- [ ] Test frontend (Jest + React Testing Library) – ancora da impostare
- [ ] Documentazione JSDoc per componenti React

### Documentazione generale
- [ ] Aggiungere badge nel README per documentazione e test
- [ ] Automatizzare generazione documentazione in CI (GitHub Actions o simile)

### Test
- [ ] Aggiungere test per errori (404, 400, 500) già coperti in parte
- [ ] Mockare chiamate a Ollama nei test di integrazione (già fatto in pipeline)
- [ ] Aumentare copertura (target > 80%)

---

## 6. Comandi utili riassunti

### Backend
```bash
cd backend

# Avvio server in sviluppo
npm start

# Test
npm test                # Esegue tutti i test
npm run test:watch      # Esegue i test in watch mode
npm run test:coverage   # Esegue test con report di copertura

# Documentazione
npm run docs            # Genera HTML (JSDoc)
npm run docs:md         # Genera Markdown per LLM (jsdoc-to-markdown)
npm run docs:all        # Genera entrambi (HTML + MD)

# Utilità
npm install --save-dev <pacchetto>   # Aggiunge dipendenza di sviluppo
```

### Frontend
```bash
cd frontend

# Avvio in sviluppo
npm run dev

# Build produzione
npm run build

# Test (ancora da configurare completamente)
npm test                # (da impostare)

# Documentazione (da configurare analogamente al backend)
npm run docs            # (da impostare)
```

### Generale (cross-platform)
```bash
# Pulire cache npm
npm cache clean --force

# Installare pacchetti con registro alternativo (se timeout)
npm install --registry=https://registry.npmmirror.com

# Su Windows (PowerShell) per eseguire test con variabili d'ambiente
$env:NODE_ENV='test'; jest --runInBand --detectOpenHandles
```

### Configurazione degli script in `backend/package.json` (assicurati che esistano)
```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test jest --runInBand --detectOpenHandles",
    "test:watch": "cross-env NODE_ENV=test jest --watch",
    "test:coverage": "cross-env NODE_ENV=test jest --coverage",
    "docs": "jsdoc -c jsdoc.conf.json",
    "docs:md": "jsdoc2md --files ./services/*.js ./controllers/*.js ./models/*.js ./utils/*.js > ../docs/backend/api.md",
    "docs:all": "npm run docs && npm run docs:md"
  }
}
```

---

## 7. Architettura della pipeline di estrazione (stato attuale)

### Servizi implementati e testati
| Servizio | Responsabilità | File |
|----------|---------------|------|
| `TextExtractorService` | Estrae testo da PDF, MD, TXT, HTML | `services/textExtractorService.js` |
| `ChunkService` | Suddivide testo in chunk con overlap | `services/chunkService.js` |
| `OllamaService` | Chiamata LLM con timeout e troncamento | `services/ollamaService.js` |
| `RagService` | ChromaDB via HTTP o Python bridge | `services/ragService.js` |
| `MethodologyService` | Carica tassonomia e prompt da manifesto | `services/methodologyService.js` |
| `AssetMergeService` | Unisce asset per similarità (trigrammi) | `services/assetMergeService.js` |

### Orchestratore
- **`AssetExtractionPipeline`**: coordina tutti i servizi
- **Input**: `files`, `contextFiles`, `methodology`, `options` (`useChunking`, `useRag`)
- **Output**: `{ assets, rawOccurrences, chunksProcessed }`

### Controller e route
- **`AssetExtractionController`**: valida richiesta, chiama pipeline, salva asset via `assetService.importAssets`
- **Route**: `POST /api/analyze/extract-assets`

### Persistenza asset avanzati
- Unificati in `threat-model.json` (campo `advancedAssets` annidato)
- Migrazione automatica all'avvio (se esiste `advanced-assets.json` separato, convertito e poi eliminato)

---

## 8. Note per LLM

Se stai leggendo questo file come LLM, tieni presente:

1. La documentazione JSDoc in formato Markdown è in `docs/backend/api.md` (se generata)
2. I pattern di sviluppo sono **layer backend** e **unidirectional data flow frontend**
3. I test sono una garanzia di correttezza – se modifichi il codice, assicurati di aggiornare i test
4. Le priorità sono elencate sopra: concentrati sul frontend e sulla rimozione del codice legacy
5. Ogni funzione pubblica deve avere **JSDoc completo**
6. Non aggiungere dipendenze senza validare l'impatto sui test e sulla documentazione
7. Questo file è la **fonte di verità** per lo stato del progetto. Se qualcosa qui non corrisponde al codice, aggiorna il file
8. Per la modalità `python-client` del RAG, lo script `rag_bridge.py` è già presente in `backend/services/`. Assicurati che Chromadb sia installato nell'ambiente Python configurato.

---

## 9. Contatti e riferimenti

| Risorsa | Link / Percorso |
|---------|----------------|
| **Repository** | https://github.com/nballestriero/threat-modeler |
| **Documentazione generata** | `docs/backend/index.html` (locale) |
| **Contesto LLM** | Questo file (`PROJECT_CONTEXT.md`) |
| **Script RAG Python** | `backend/services/rag_bridge.py` |
| **Manifesto metodologie** | `backend/methodologies/manifest.json` |

---

> ✅ **Prossimo passo suggerito:** Procedere con il frontend: creare API layer, separare store Zustand e impostare i test con React Testing Library.

*Fine del documento.*