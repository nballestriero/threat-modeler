# PROJECT_CONTEXT.md – threat-modeler

**Ultimo aggiornamento:** 30 maggio 2025  
**Versione contesto:** 5.4  
**Manutenuto da:** *(da compilare)*

> 🤖 **Istruzione per LLM:** Se stai leggendo questo file, assumi che rappresenti fedelmente lo stato attuale del progetto. Usalo per contestualizzare le tue risposte. Tutte le convenzioni descritte qui devono essere rispettate nel codice che suggerisci.

---

## 📌 Scopo dell'applicazione

**threat-modeler** è uno strumento assistito da intelligenza artificiale (LLM) progettato per:

- **Aiutare esperti di threat modeling** ad automatizzare l'estrazione di asset, la generazione di DFD e l'applicazione di metodologie di analisi dei rischi (STRIDE, PASTA, LINDDUN, FMEA, ecc.).
- **Supportare studenti** nell'apprendimento del threat modeling, guidandoli passo passo attraverso le fasi di analisi di un sistema software.

L'applicazione si integra con **Ollama** (LLM locale) e **ChromaDB** (RAG) per arricchire il contesto, suggerire miglioramenti e generare report automatici.

---

## 🎯 Obiettivi funzionali (visione completa)

| Fase | Descrizione |
|------|-------------|
| **Configurazione** | Pagine dedicate per impostare RAG, Ollama, database (alternativa ai JSON), e progetto corrente. |
| **Raccolta documenti** | Caricamento di documenti di progetto (specifiche, codice, architettura) e contesto (paper, best practice). |
| **Analisi iniziale** | Estrazione automatica degli asset (con tassonomia DFD base) usando LLM e RAG, per creare il DFD base. |
| **Metodologie multiple** | Applicazione di metodologie (PASTA, STRIDE, STRIDE-AI, FMEA, LINDDUN) partendo dall'asset base e dal DFD base, generando nuovi asset specifici per ogni metodologia. |
| **Miglioramento assistito** | In ogni fase, possibilità di usare l'LLM per affinare descrizioni, suggerire nuovi asset o arricchire i flussi. |
| **Analisi rischi** | Ricavare un elenco ordinato di rischi (con priorità) per supportare le decisioni di mitigazione, anche in contesti regolamentati (es. medico, energetico). |
| **Report automatico** | Generazione di un report finale (PDF o HTML) contenente asset, DFD, rischi e raccomandazioni. |

---

## 🧠 Architettura realizzata (al 30 maggio 2025)

### Backend (Node.js + Express)

**Layered architecture** consolidata:

| Layer | Ruolo | Esempio |
|-------|-------|---------|
| **Routes** | Gestione HTTP (chiamano controller) | `analysis.js`, `assets.js` |
| **Controllers** | Orchestrazione, gestione errori | `assetExtractionController.js` |
| **Services** | Logica di business pura | `assetExtractionPipeline.js`, `ragService.js` |
| **Models** | I/O su file JSON | `assetModel.js` |
| **Utils** | Helper (config, errorHandler, file) | `configUtils.js`, `errorHandler.js` |

**Servizi principali implementati:**
- `TextExtractorService` – PDF, Markdown, TXT, HTML
- `ChunkService` – suddivisione con overlap
- `OllamaService` – chiamate a Ollama (timeout 120s)
- `RagService` – bridge Python o HTTP server per ChromaDB
- `MethodologyService` – gestione metodologie (manifesto, tassonomie, prompt)
- `AssetMergeService` – merging per similarità (trigrammi)
- `AssetExtractionPipeline` – orchestratore completo
- `AssetService`, `FlowService` – CRUD asset e flussi

**RAG e metodologie:**
- Ogni metodologia ha una collezione ChromaDB dedicata (`methodology_{id}`).
- All'avvio (se RAG abilitato) viene indicizzata automaticamente la tassonomia della metodologia (un documento per categoria).
- Durante l'estrazione, la pipeline arricchisce la query RAG con i nomi delle categorie.
- L'utente può caricare file di contesto che vengono indicizzati nella stessa collezione.

**Test:**
- ✅ 12 suite, 53 test → tutti passanti.
- ✅ Test di integrazione con ChromaDB reale e con mock di Ollama.

### Frontend (React + Zustand + Vite)

**Architettura unidirectional data flow:**
```
UI components → Zustand store → API calls → Backend → Aggiornamento store → UI re-render
```

**API layer** – `src/api/` (assetsApi, taxonomyApi, configApi, analysisApi)  
**Config** – `src/config/api.js` (axios instance con `VITE_API_BASE`)

**Store Zustand – architettura consolidata:**
- ✅ **Store monolitico intelligente**: `useThreatModelStore.js` (unica fonte di verità per asset e flussi)
- **Motivazione**: i flussi dipendono strettamente dagli asset (collegano due asset); mantenerli nello stesso store garantisce:
  - Aggiornamenti atomici e coerenti
  - Nessuna necessità di sincronizzazione tra store multipli
  - Semplificazione dei componenti (un solo hook da usare)
- **Miglioramenti applicati**:
  - Flag `assetsLoaded` / `flowsLoaded` per prevenire fetch duplicati
  - CRUD completi per asset e flussi (add, update, delete)
  - Documentazione interna chiara per sezioni asset/flows
  - Export compatibile con tutti i componenti esistenti

**Inizializzazione centralizzata (`AppInitializer`):**
- Componente React montato una sola volta in `App.jsx` all'avvio dell'applicazione.
- **Scopo**: chiamare `fetchAssets()` e `fetchFlows()` immediatamente, prima del rendering di altri componenti.
- **Risolve**: chiamate duplicate al backend e diagrammi vuoti per dati non ancora pronti al primo render.
- **Fallback**: i componenti (`AssetInventory`, `DfdEditor`) mantengono le proprie `useEffect` con fetch, ma i flag nello store prevengono duplicati.
- ⚠️ **Da verificare**: `<AppInitializer />` è correttamente montato in `App.jsx` (prima del routing/layout) e non causa side-effect o re-render indesiderati.

**Componenti migrati:**
- `DocumentationManager` – usa `useThreatModelStore` e `assetsApi`
- `BaseAssetsManager` (precedentemente `AssetInventory`) – usa `useThreatModelStore` e `taxonomyApi`
- `Sidebar` – usa `useAppStore` per la navigazione (fasi)
- `App` – orchestratore delle fasi, include `AppInitializer`

**Componenti ancora da migrare (priorità):**
- `ConfigPanel` → userà `configApi` e `taxonomyApi`
- `DfdEditor` → creare `flowsApi` (lo store rimane `useThreatModelStore`)
- `MethodologyManager` → creare `methodologiesApi`

**Variabili d'ambiente:**
```env
VITE_API_BASE=http://localhost:3001/api
```

---

## ✅ Passi fatti (dal 29 maggio 2025)

### Backend
- [x] Refactoring completo pipeline estrazione asset (modulare, testata)
- [x] Implementazione RAG con bridge Python e ChromaDB
- [x] Indicizzazione automatica delle tassonomie per metodologia
- [x] Migrazione asset e flows a layered architecture
- [x] Pulizia codice legacy (`analysisDfd.js`, `enrichment.js`, `advancedAssets.js`, `OLD_*`, `config.json.bak`)
- [x] Creazione middleware error handler centralizzato
- [x] Test di integrazione con file reali e RAG reale
- [x] Documentazione JSDoc generabile (HTML + Markdown)

### Frontend
- [x] Creazione API layer (`assetsApi`, `taxonomyApi`, `configApi`, `analysisApi`)
- [x] Rafforzamento store monolitico `useThreatModelStore` (flag, CRUD completi, documentazione)
- [x] Creazione e integrazione pattern `AppInitializer` per caricamento dati centralizzato
- [x] Migrazione di `DocumentationManager` e `AssetInventory` → `BaseAssetsManager`
- [x] Aggiornamento `Sidebar` e `App` per usare i nuovi pattern
- [x] Risoluzione errori di import (percorsi relativi, cache Vite)
- [x] Allineamento store e visibilità asset in `DfdEditor`

---

## ⚠️ Known issues

### Orphan flows (collegamenti orfani)
**Problema**: cancellando un asset che ha flussi associati, i flussi rimangono nel database e nello store.

**Conseguenza**: nel DFD compaiono archi verso asset inesistenti, senza possibilità di eliminarli (l'asset non è più nella lista).

**Soluzione decisa – Opzione C**:
1. Visualizzare i flussi orfani in rosso nel diagramma Mermaid, con tooltip "Collegamento interrotto"
2. Permettere l'eliminazione manuale di tali flussi dalla tabella dei flussi

**Priorità**: media (da realizzare dopo il completamento della migrazione frontend)

---

## 🚧 Passi mancanti (priorità)

### Frontend (immediati)
- [ ] Migrare `ConfigPanel.jsx` a `configApi` e `taxonomyApi`
- [ ] Creare `flowsApi.js` per migrare `DfdEditor` (lo store rimane `useThreatModelStore`)
- [ ] Creare `methodologiesApi.js` per `MethodologyManager`
- [ ] ✅ **Verifica AppInitializer**: confermare montaggio in `App.jsx`, assenza di fetch duplicate e corretta gestione fallback

### Backend (opzionali/migliorativi)
- [ ] Aggiungere validazione input con Zod sugli endpoint critici
- [ ] Supporto a ulteriori formati di documento (DOCX, ODT)
- [ ] Generare report automatico (PDF/HTML) da template

### Cleanup (priorità bassa)
- [ ] Eliminare file legacy:
  ```
  backend/OLD_2_server.js
  backend/OLD_server.js
  backend/testServer.js
  backend/advanced-assets.json
  frontend/src/OLDApp.jsx
  frontend/src/components/OLD_AssetInventory.jsx
  frontend/src/components/OLD_DocumentationManager.jsx
  ```

### Generali
- [ ] Aggiungere test frontend (Jest + React Testing Library)
- [ ] Impostare GitHub Actions per esecuzione automatica test
- [ ] Completare la documentazione dell'API (Swagger/OpenAPI)

---

## 🔧 Comandi utili

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
# (test e documentazione da configurare)
```

---

## 📌 Note tecniche importanti

**Estensione dei file JavaScript** – Nel frontend, i file `.js` o `.jsx` sono equivalenti per Vite. Si consiglia di usare `.js` per moduli che non contengono JSX (es. API, store, config) e `.jsx` solo per componenti con JSX. `taxonomyApi.js` (e simili) possono essere `.js`.

**Percorsi relativi** – I componenti in `src/components/` importano store e API con `../store/...` e `../api/...` (un solo `..` per salire a `src`). Non usare `../../` se non per livelli superiori.

**Cache di Vite** – In caso di errori di import dopo modifiche, cancellare `node_modules/.vite` e riavviare.

**Store monolitico** – `useThreatModelStore` gestisce sia asset che flussi: non frammentare senza una motivazione architetturale forte.

**AppInitializer** – Deve essere montato una volta sola in `App.jsx`. Non renderizza UI visibile, esegue solo `useEffect` per popolare lo store. Separare la logica di inizializzazione dal store segue il principio di separazione delle responsabilità e aggira i limiti di inizializzazione nativa di Zustand.

---

## 📎 Riferimenti

| Risorsa | Link / Percorso |
|---------|----------------|
| Repository | https://github.com/nballestriero/threat-modeler |
| Documentazione backend | `docs/backend/index.html` |
| Contesto LLM | Questo file (`PROJECT_CONTEXT.md`) |
| Script RAG Python | `backend/services/rag_bridge.py` |
| Manifesto metodologie | `backend/methodologies/manifest.json` |
| Store frontend | `frontend/src/store/useThreatModelStore.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |

---

> 🔚 Fine del documento  
> Ultima verifica: 30 maggio 2025  
> Prossima revisione: al completamento della verifica di `AppInitializer` e migrazione di `ConfigPanel.jsx`