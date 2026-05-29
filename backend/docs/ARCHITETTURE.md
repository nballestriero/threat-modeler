# Architettura di threat-modeler

## Flusso dati (unidirectional)

### Frontend
1. L'utente interagisce con un componente React.
2. Il componente chiama un'azione dello **store Zustand**.
3. Lo store invoca una funzione del **layer API** (`src/api/*.js`).
4. La funzione API fa una richiesta HTTP al backend.
5. La risposta aggiorna lo store.
6. Il componente si rirenderizza con i nuovi dati.

### Backend
1. La **route** Express riceve la richiesta.
2. La route chiama un **controller**.
3. Il controller coordina uno o più **service**.
4. I service contengono la logica di business e usano i **model** per leggere/scrivere dati.
5. Il controller invia la risposta JSON.

## Convenzioni di documentazione
- Tutte le funzioni pubbliche devono avere JSDoc con `@param` e `@returns`.
- Generare documentazione HTML con `npm run docs` nel backend e frontend.
- Questo file `.md` è pensato per LLM: descrive i macro-flussi e le responsabilità.

## Cartelle principali

### Backend
- `controllers/` – gestiscono req/res
- `services/` – logica di business pura
- `models/` – I/O file JSON
- `utils/` – helper generici
- `routes/` – mapping HTTP → controller

### Frontend
- `components/` – view React
- `store/` – Zustand stores
- `api/` – chiamate HTTP
- `config/` – configurazione (axios instance)