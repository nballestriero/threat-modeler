STUDENT_CONTEXT.md – threat-modeler (Corso Pratico di Sviluppo)
Ultimo aggiornamento: 31 maggio 2025
Versione contesto didattico: 1.0
Target: Studenti, Junior Developer, Contributori Open Source
Manutenuto da: (da compilare)

🤖 Istruzione per LLM / Docenti: Se stai leggendo questo file, assumi che rappresenti il materiale didattico ufficiale del progetto. Usalo per generare esercizi, spiegare pattern architetturali o guidare sessioni di debugging. Tutti gli esempi di codice fanno riferimento a file realmente presenti nel repository.

📌 Scopo del documento
Questo file accompagna gli studenti nell'apprendimento pratico dello sviluppo software attraverso il progetto `threat-modeler`. Documenta:
- L'architettura reale dell'applicazione (Frontend + Backend + Servizi esterni)
- I pattern di codice adottati (API Layer, Zustand, JSDoc, gestione errori)
- Tecniche di debugging professionali applicate al codice sorgente
- Esercizi progressivi per costruire un portfolio concreto

🏗️ Architettura spiegata passo-passo

## 1. Client-Server: come comunicano Frontend e Backend
```mermaid
flowchart LR
    Browser[🖥️ React UI (Browser)] -- "HTTP (axios/fetch)" --> Server[⚙️ Express API (Node.js)]
    Server -- "Risposta JSON" --> Browser
    Server -- "Richieste interne" --> Ollama[🤖 Ollama LLM]
    Server -- "Richieste interne" --> Chroma[💾 ChromaDB RAG]
```
- **Frontend**: Non parla mai direttamente con Ollama/ChromaDB per motivi di sicurezza (CORS, segreti, proxy).
- **Backend**: Fa da "ponte sicuro". Espone endpoint REST (`/api/ollama/test`, `/api/rag/test-connection`, ecc.) che il frontend consuma.
- **Regola didattica**: Ogni chiamata di rete dal browser deve passare attraverso un file in `frontend/src/api/`.

## 2. Gestione dello Stato: Zustand (State Management)
L'app usa Zustand per evitare la "prop drilling" e sincronizzare automaticamente i componenti.
```javascript
// 📁 frontend/src/store/useThreatModelStore.js
import { create } from 'zustand';
import { assetsApi } from '../api/assetsApi';

export const useThreatModelStore = create((set, get) => ({
  assets: [],
  loading: false,
  
  // Azione asincrona: chiama API → aggiorna stato → triggera re-render
  fetchAssets: async () => {
    set({ loading: true });
    try {
      const data = await assetsApi.getAll();
      set({ assets: data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  }
}));
```
- **Sottoscrizione nei componenti**: I componenti leggono lo store e si aggiornano automaticamente quando i dati cambiano.
- **Selector stabili**: Ogni valore viene selezionato singolarmente per evitare infinite re-render.

## 3. API Layer: il ponte tra UI e Backend
Perché non usare `fetch()` direttamente nei componenti?
| ❌ Approccio disperso | ✅ Approccio centralizzato |
|----------------------|---------------------------|
| Chiamate sparse in 10+ componenti | Tutte in `src/api/*.js` |
| Gestione errori duplicata | Retry, timeout, fallback in un solo posto |
| Difficile da testare | Mockabile in 2 righe con Jest/MSW |
| Hardcoded URL | Usa `VITE_API_BASE` da configurazione |

Esempio reale:
```javascript
// 📁 frontend/src/api/configApi.js
import api from '../config/api'; // axios preconfigurato

export const testOllamaConnection = async ({ host, port }) => {
  const res = await api.post('/ollama/test', { host, port });
  return res.data; // { connected: boolean, message: string }
};
```

🔑 Pattern fondamentali (con esempi dal progetto)

## ✅ 1. Selector Zustand stabili (evitare infinite re-render)
```javascript
// ✅ CORRETTO: ogni hook restituisce un riferimento stabile
const assets = useThreatModelStore(state => state.assets);
const deleteAsset = useThreatModelStore(state => state.deleteAsset);

// ❌ SBAGLIATO: crea un nuovo oggetto ad ogni render → loop infinito
const { assets, deleteAsset } = useThreatModelStore(state => ({
  assets: state.assets,
  deleteAsset: state.deleteAsset
}));
```
> 💡 **Perché succede?** Zustand usa `Object.is` per confrontare il risultato del selector. `{...} !== {...}` anche se il contenuto è identico.

## ✅ 2. Inizializzazione centralizzata (`AppInitializer`)
Per evitare che ogni componente faccia `fetch()` all'avvio (concorrenza, dati duplicati, UI vuota):
```jsx
// 📁 frontend/src/components/AppInitializer.jsx
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
Montato una volta in `App.jsx`, garantisce che i dati siano pronti prima del primo render.

## ✅ 3. Documentazione automatica con JSDoc
Ogni funzione esportata deve avere:
```javascript
/**
 * Testa la connettività verso ChromaDB (RAG).
 * @async
 * @returns {Promise<{connected: boolean, message: string, collections?: string[]}>} 
 */
export const testRagConnection = async () => { ... };
```
Genera documentazione HTML con `cd backend && npm run docs:all` o tool frontend equivalenti.

🐛 Guida al Debugging professionale

## Scenario reale: *"Il DFD non si aggiorna dopo aver cancellato un asset"*
Passi seguiti nel progetto (documentati per studenti):
1. **Verifica store**: `console.log(useThreatModelStore.getState().assets)` → l'asset era stato rimosso?
2. **Verifica sottoscrizioni**: `useEffect(() => console.log(assets), [assets])` in `DfdEditor.jsx` → il componente riceveva il nuovo array?
3. **Verifica API**: Network tab → `DELETE /assets/:id` → stato `204`? Backend aggiornato?
4. **Root cause trovata**: `BaseAssetsManager` usava un store legacy (`useAssetStore`) diverso da `DfdEditor` (`useThreatModelStore`).
5. **Fix applicato**: Migrazione a store monolitico + selector stabili.

## Tool indispensabili
| Strumento | Come usarlo | Cosa cercare |
|-----------|-------------|---------------|
| DevTools → Network | Filtra `Fetch/XHR` | Codici stato, payload, tempi di risposta |
| DevTools → Console | `console.log()` strategici | Flusso dati, errori JS, promesse rejected |
| React DevTools | Tab "Components" | Props, state, hook execution order |
| Zustand DevTools | Estensione browser | Snapshot store, history azioni, time-travel |

🛠️ Setup & Workflow per studenti

```bash
# 1. Clona e installa
git clone https://github.com/nballestriero/threat-modeler
cd threat-modeler
cd frontend && npm install
cd ../backend && npm install

# 2. Variabili d'ambiente (default funzionano in locale)
cp backend/.env.example backend/.env

# 3. Avvia server (due terminali)
# T1: Backend
cd backend && npm start          # http://localhost:3001
# T2: Frontend
cd frontend && npm run dev       # http://localhost:5173

# 4. Verifica
- Apri http://localhost:5173
- ⚙️ Configurazione → Test Ollama → "✅ Connesso"
- Fase 2 → Crea asset → Fase 3 → Verifica DFD aggiornato
```

🎯 Esercizi progressivi (per portfolio)

| Livello | Esercizio | File da modificare | Competenza |
|---------|-----------|-------------------|------------|
| 🟢 Base | Aggiungi campo `timeout` in `configApi.js` e validazione UI | `configApi.js`, `ConfigPanel.jsx` | API Layer, Form handling |
| 🟢 Base | Aggiungi JSDoc a 3 funzioni e rigenera docs | Qualsiasi `*.js` | Documentazione automatica |
| 🟡 Medio | Crea endpoint `/api/stats` che conta asset/flussi | `backend/routes/stats.js`, `frontend/src/api/statsApi.js` | Full-stack CRUD |
| 🟡 Medio | Scrivi test unitario per `testOllamaConnection` con MSW | `frontend/src/api/__tests__/configApi.test.js` | Testing frontend |
| 🔴 Avanzato | Migra `MethodologyManager` a store monolitico + API layer | `MethodologyManager.jsx`, `methodologiesApi.js` | Refactoring architetturale |
| 🔴 Avanzato | Aggiungi caching HTTP + stale-while-revalidate per asset | `assetsApi.js`, store flags | Performance UX |

🔄 Come mantenere aggiornato questo documento

1. **Ogni nuovo pattern** → Aggiungi sezione in `🔑 Pattern fondamentali`
2. **Ogni bug risolto** → Aggiungi caso in `🐛 Guida al Debugging`
3. **Ogni nuovo esercizio** → Aggiungi riga in `🎯 Esercizi progressivi`
4. **Pre-merge checklist**:
   - [ ] Il codice segue i pattern documentati qui?
   - [ ] I commenti JSDoc sono presenti sulle funzioni pubbliche?
   - [ ] Gli esercizi proposti sono ancora compatibili con la codebase?

> 📌 **Nota per docenti**: Questo file è progettato per essere "vivo". Incoraggiate gli studenti a fare Pull Request con correzioni, nuovi esercizi o esempi di debugging. Il learning by teaching è il metodo più efficace.

📎 Riferimenti rapidi
| Risorsa | Percorso |
|---------|----------|
| Contesto tecnico completo | `PROJECT_CONTEXT.md` |
| Store principale | `frontend/src/store/useThreatModelStore.js` |
| API Layer esempio | `frontend/src/api/configApi.js` |
| Inizializzatore | `frontend/src/components/AppInitializer.jsx` |
| Backend routes | `backend/routes/` |
| Documentazione generata | `docs/backend/index.html` |

🔚 Fine del documento didattico
Ultima verifica: 31 maggio 2025
Prossima revisione: al completamento della migrazione `MethodologyManager` e aggiunta test frontend