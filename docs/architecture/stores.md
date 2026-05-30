# Architettura Store Zustand

## Panoramica
Il frontend gestisce lo stato globale tramite tre store specializzati, ciascuno con un dominio e un ciclo di vita distinti.

```mermaid
flowchart TD
    subgraph UI["🖥️ Componenti React"]
        App[App.jsx]
        Sidebar[Sidebar.jsx]
        DocMgr[DocumentationManager.jsx]
        BaseMgr[BaseAssetsManager.jsx]
        DfdEd[DfdEditor.jsx]
        Init[AppInitializer.jsx]
    end

    subgraph Stores["🗄️ Store Zustand"]
      ThreatStore[("useThreatModelStore<br/>Asset + Flows")]:::main
      AppStore[("useAppStore<br/>Navigazione")]:::nav
      AnalysisStore[("useAnalysisStore<br/>Estrazione LLM")]:::temp
    end

    subgraph API["🌐 API Layer Frontend"]
      AssetsApi[assetsApi.js]
      FlowsApi[flowsApi.js]
      TaxonomyApi[taxonomyApi.js]
      AnalysisApi[analysisApi.js]
    end

    subgraph Backend["⚙️ Backend Node.js"]
      Routes[Routes / Controllers]
      Services[Services Layer]
      Ollama[OllamaService]
      RAG[RagService]
      JSON[(JSON Models)]
    end

    %% UI -> Stores
    App --> AppStore
    Sidebar --> AppStore
    Init --> ThreatStore
    DocMgr --> ThreatStore
    DocMgr --> AnalysisStore
    BaseMgr --> ThreatStore
    DfdEd --> ThreatStore

    %% Stores -> API
    ThreatStore --> AssetsApi
    ThreatStore --> FlowsApi
    ThreatStore --> TaxonomyApi
    AnalysisStore --> AnalysisApi

    %% API -> Backend
    AssetsApi & FlowsApi & TaxonomyApi --> Routes
    AnalysisApi --> Routes
    Routes --> Services
    Services --> Ollama & RAG & JSON

    classDef main fill:#dbeafe,stroke:#1e40af,stroke-width:2px
    classDef nav fill:#dcfce7,stroke:#166534
    classDef temp fill:#fef3c7,stroke:#92400e,stroke-dasharray:5 5
```

## useThreatModelStore (Principale)
- **Tipo**: Persistente (unica fonte di verità per il modello)
- **Responsabilità**: CRUD asset/flussi, flag `assetsLoaded`/`flowsLoaded`, sincronizzazione con backend
- **Componenti**: `BaseAssetsManager`, `DfdEditor`, `DocumentationManager`, `AppInitializer`
- **Flusso aggiornamento**:
  1. Componente chiama azione store (es. `deleteAsset`)
  2. Store chiama API → Backend → Aggiorna JSON/DB
  3. Store aggiorna stato locale
  4. Zustand triggera re-render automatico in tutti i componenti sottoscritti

## useAppStore (Navigazione)
- **Tipo**: Persistente (sessione utente)
- **Responsabilità**: `currentPhase` (1-5), stato sidebar
- **Componenti**: `App`, `Sidebar`
- **Nota**: Nessun dato di dominio, solo routing UI

## useAnalysisStore (Estrazione LLM)
- **Tipo**: Transitorio (viene resettato dopo ogni estrazione)
- **Responsabilità**: Progresso estrazione, chunk in elaborazione, errori LLM temporanei
- **Componenti**: `DocumentationManager` (solo durante Fase 1)
- **Nota**: I risultati finali vengono scritti in `useThreatModelStore`, non rimangono qui

## Best Practice per i Componenti
```javascript
// ✅ Selector stabili (uno per valore)
const assets = useThreatModelStore(state => state.assets);
const deleteAsset = useThreatModelStore(state => state.deleteAsset);

// ✅ Aggregazione sicura con useShallow
import { useShallow } from 'zustand/shallow';
const { assets, deleteAsset } = useThreatModelStore(
  useShallow(state => ({ assets: state.assets, deleteAsset: state.deleteAsset }))
);

// ❌ DA EVITARE (crea oggetto nuovo ad ogni render → infinite loop)
const { assets, deleteAsset } = useThreatModelStore(state => ({
  assets: state.assets,
  deleteAsset: state.deleteAsset
}));
```

> 📌 **Manutenzione**: Aggiornare questo diagramma ogni volta che un nuovo componente viene collegato a uno store o quando cambia la struttura degli API layer.