# 🎓 Corso di Programmazione: Imparare con threat-modeler

> Questo documento è pensato per studenti che vogliono imparare a sviluppare applicazioni reali usando `threat-modeler` come caso di studio pratico. Ogni modulo combina teoria, osservazione del codice ed esercizi hands-on.

## 📚 Struttura del corso

### 🟦 Modulo 1: Architettura Client-Server
**Obiettivo**: Capire come frontend e backend comunicano tramite HTTP.

#### Concetti chiave
```mermaid
flowchart LR
    Browser[🖥️ Browser (React)] -- "HTTP (fetch/axios)" --> Server[⚙️ Server (Node.js/Express)]
    Server -- "Risposta JSON" --> Browser
    Server -- "Chiama servizi esterni" --> External[🤖 Ollama / 💾 ChromaDB]
```

#### 🔍 Esercizio: Traccia una chiamata API
1. Apri l'app e vai in **⚙️ Configurazione**
2. Apri DevTools (`F12`) → scheda **Network**
3. Clicca su **Test connessione** (sezione Ollama)
4. Osserva nella tabella:
   - Metodo: `POST`
   - Endpoint: `/api/ollama/test`
   - Response: `{ connected: true/false, message: "..." }`
5. Trova il codice corrispondente:
   - Frontend: `src/api/configApi.js` → `testOllamaConnection()`
   - Backend: `backend/routes/ollama.js` → `router.post('/ollama/test')`

---

### 🟨 Modulo 2: Gestione dello Stato con Zustand
**Obiettivo**: Capire come i dati fluiscono e si sincronizzano nell'UI React.

#### Pattern fondamentale
```javascript
// 1. Definizione store (src/store/useThreatModelStore.js)
const useThreatModelStore = create((set, get) => ({
  assets: [],
  addAsset: async (data) => {
    const newAsset = await api.post('/assets', data);
    set(state => ({ assets: [...state.assets, newAsset] })); // Aggiorna stato
  }
}));

// 2. Utilizzo in componente (src/components/BaseAssetsManager.jsx)
const assets = useThreatModelStore(state => state.assets); // Sottoscrizione reattiva
const addAsset = useThreatModelStore(state => state.addAsset);

// 3. Il componente si aggiorna AUTOMATICAMENTE quando `assets` cambia!
```

#### 🔍 Esercizio: Aggiungi un log di debug
1. Apri `src/store/useThreatModelStore.js`
2. Trova la funzione `addAsset`
3. Aggiungi temporaneamente: `console.log('[STORE] Nuovo asset aggiunto:', newAsset);`
4. Usa l'UI per creare un asset e osserva la console del browser. Rimuovi il log dopo il test.

---

### 🟧 Modulo 3: API Layer - Il ponte tra UI e Backend
**Obiettivo**: Capire perché centralizzare le chiamate HTTP in file come `configApi.js`.

#### ❌ Cattiva pratica (logica API sparsa)
```javascript
// In un componente qualsiasi
const handleClick = async () => {
  const res = await fetch('http://localhost:3001/api/ollama/test');
  const data = await res.json();
  // Gestione errori, retry, timeout... tutto ripetuto in ogni componente!
};
```

#### ✅ Buona pratica (API layer centralizzato)
```javascript
// src/api/configApi.js
export const testOllamaConnection = async ({ host, port }) => {
  const res = await api.post('/ollama/test', { host, port });
  return res.data; // axios gestisce già baseURL, headers e parsing JSON
};

// src/components/ConfigPanel.jsx
import { configApi } from '../api/configApi';
const result = await configApi.testOllamaConnection({ host, port });
```

#### Vantaggi del pattern
| Vantaggio | Spiegazione |
|-----------|-------------|
| 🔁 Riutilizzo | Chiamato da qualsiasi componente senza duplicare codice |
| 🧪 Testing | Facile mockare `configApi` nei test unitari |
| 🔧 Manutenzione | Se cambia l'endpoint, si modifica un solo file |
| 🛡️ Resilienza | Centralizza retry, timeout, gestione errori e fallback |

#### 🔍 Esercizio: Crea il tuo metodo API
1. Aggiungi a `src/api/configApi.js`:
   ```javascript
   /**
    * Recupera la versione dell'applicazione dal backend.
    * @returns {Promise<{version: string, build: string}>}
    */
   export const getAppVersion = async () => {
     const res = await api.get('/version');
     return res.data;
   };
   ```
2. Aggiorna `configApi` namespace: `export const configApi = { ..., getAppVersion };`
3. Usalo in `ConfigPanel` per mostrare la versione nel footer.

---

### 🟥 Modulo 4: Documentazione Automatica con JSDoc
**Obiettivo**: Imparare a scrivere codice auto-documentato e generare documentazione HTML.

#### Esempio di funzione ben documentata
```javascript
/**
 * Testa la connettività verso un'istanza Ollama.
 * @async
 * @param {Object} params - Parametri di connessione
 * @param {string} params.host - Host Ollama (default: 'http://localhost')
 * @param {string|number} params.port - Porta Ollama (default: 11434)
 * @returns {Promise<{connected: boolean, message: string}>} Esito del test
 * @throws {Error} Se la richiesta HTTP fallisce
 */
export const testOllamaConnection = async ({ host, port }) => { ... };
```

#### 🔍 Esercizio: Genera la documentazione
1. Terminale: `cd backend && npm run docs:all`
2. Apri `docs/backend/index.html` nel browser
3. Cerca `testOllamaConnection` o `getConfig`
4. Modifica un JSDoc, rigenera e verifica le modifiche riflesse nell'HTML.

---

### 🟪 Modulo 5: Debugging e Risoluzione Problemi
**Obiettivo**: Sviluppare skill di troubleshooting professionale.

#### Scenario reale: *"Il DFD non si aggiorna dopo aver cancellato un asset"*
**Step-by-step debugging**:
1. ✅ **Verifica lo store** (console browser):
   ```javascript
   // Zustand espone lo stato globale
   const store = window.__ZUSTAND_DEVTOOLS__ || require('../store/useThreatModelStore').default;
   console.log(store.getState().assets);
   ```
2. ✅ **Controlla le subscription** (temporaneo in `DfdEditor.jsx`):
   ```javascript
   useEffect(() => {
     console.log('[DfdEditor] Assets cambiati:', assets);
   }, [assets]);
   ```
3. ✅ **Verifica le API** (DevTools → Network):
   - La `DELETE /assets/:id` ha restituito `204 No Content`?
   - Il backend ha aggiornato il file JSON?

#### 🔍 Esercizio: Simula un errore controllato
1. Modifica temporaneamente `deleteAsset` nello store:
   ```javascript
   deleteAsset: async (id) => {
     throw new Error('ERRORE SIMULATO PER DEBUGGING');
     // Codice originale commentato
   };
   ```
2. Prova a cancellare un asset in UI
3. Osserva:
   - Messaggio di errore in console
   - Alert all'utente (se gestito nel componente)
   - Stato dello store (è cambiato? no, l'errore ha bloccato l'update)
4. Ripristina il codice originale.

---

## 🛠️ Setup ambiente di sviluppo per studenti

```bash
# 1. Clona il repository
git clone https://github.com/nballestriero/threat-modeler
cd threat-modeler

# 2. Installa dipendenze
cd frontend && npm install
cd ../backend && npm install

# 3. Configura variabili d'ambiente
cp backend/.env.example backend/.env
# (Modifica .env solo se necessario, i default funzionano in locale)

# 4. Avvia i server (usa due terminali o tmux/screen)
# Terminale 1: Backend
cd backend && npm start          # → http://localhost:3001

# Terminale 2: Frontend  
cd frontend && npm run dev       # → http://localhost:5173

# 5. Verifica funzionamento
- Apri http://localhost:5173
- Vai in ⚙️ Configurazione → Test connessione Ollama
- Dovresti vedere "✅ Connesso" (se Ollama è attivo su localhost:11434)
```

---

## 📖 Risorse aggiuntive consigliate

| Argomento | Risorsa ufficiale |
|-----------|-------------------|
| React + Hooks | [react.dev/learn](https://react.dev/learn) |
| Zustand (State Management) | [zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs) |
| Express.js (Backend) | [expressjs.com/en/guide](https://expressjs.com/en/guide) |
| Axios (HTTP Client) | [axios-http.com/docs](https://axios-http.com/docs) |
| Mermaid (Diagrammi) | [mermaid.js.org](https://mermaid.js.org) |
| JSDoc (Documentazione) | [jsdoc.app](https://jsdoc.app) |

---

## 🎯 Progetti pratici suggeriti (per portfolio)

1. **Aggiungi un campo di configurazione** (es. `ollama.temperature` o `rag.chunkSize`)
2. **Crea un nuovo endpoint API** `/api/stats` che restituisce conteggi di asset/flussi
3. **Scrivi un test unitario** per `configApi.testOllamaConnection()` con Jest + MSW
4. **Aggiungi un diagramma Mermaid** alla documentazione di un componente a scelta
5. **Refactoring guidato**: migra un componente legacy (es. `ConfigPanel`) al pattern API layer + Zustand stable selectors

> 💡 **Consiglio per studenti**: Inizia modificando file piccoli e ben documentati (`configApi.js`, store), poi passa a componenti complessi. Usa `console.log` strategicamente e impara a leggere la scheda Network di DevTools. Il debugging è il 50% del lavoro di uno sviluppatore!

---

*Documento in evoluzione. Contribuisci con Pull Request su GitHub o suggerisci nuovi esercizi!*