# Pipeline AI ed Estrazione Asset

## Panoramica del Flusso di Estrazione (Fase 1)
Il processo trasforma documenti grezzi in asset strutturati pronti per il threat modeling, integrando RAG e LLM locale.

```mermaid
flowchart LR
    subgraph Input["📥 Fase 1: Input"]
        Docs[Documenti Progetto]
        Context[File Contesto]
    end

    subgraph Processing["⚙️ Pipeline Backend"]
        Extract[TextExtractorService<br/>PDF, MD, TXT, HTML]
        Chunk[ChunkService<br/>Suddivisione + Overlap]
        Index[RagService<br/>Indicizzazione ChromaDB]
        Query[RAG Query<br/>+ Categorie Tassonomia]
        LLM[OllamaService<br/>Generazione Asset]
        Merge[AssetMergeService<br/>Deduplicazione Trigrammi]
    end

    subgraph Output["💾 Fase 2: Output"]
        Store[useThreatModelStore<br/>Assets + Flows]
        UI[BaseAssetsManager.jsx<br/>UI Aggiornata]
    end

    Docs --> Extract --> Chunk --> Index
    Context --> Index
    Index --> Query --> LLM --> Merge --> Store
    Store --> UI

    classDef input fill:#f3f4f6,stroke:#6b7280
    classDef proc fill:#dbeafe,stroke:#1e40af
    classDef out fill:#dcfce7,stroke:#166534
```

## Sequenza di Interazione (Dettagliata)
```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as AnalysisController
    participant RAG as RagService
    participant DB as ChromaDB
    participant LLM as OllamaService
    participant MERGE as AssetMergeService
    participant STORE as useThreatModelStore

    UI->>API: POST /api/analysis/extract (documenti)
    API->>RAG: processDocuments()
    RAG->>DB: Store chunks & taxonomy
    loop Per ogni chunk rilevante
        RAG->>DB: Query similar chunks
        DB-->>RAG: Contesto recuperato
        RAG->>LLM: Genera asset con prompt + contesto
        LLM-->>RAG: JSON asset suggeriti
    end
    RAG->>MERGE: mergeAssets(extracted, existing)
    MERGE-->>API: Asset consolidati
    API-->>UI: 200 OK
    UI->>STORE: addAsset(massive)
    STORE-->>UI: Re-render automatico
```

## Componenti Chiave della Pipeline
| Servizio | File | Responsabilità |
|----------|------|----------------|
| `TextExtractorService` | `backend/services/textExtractorService.js` | Estrae testo da PDF, MD, TXT, HTML |
| `ChunkService` | `backend/services/chunkService.js` | Suddivide il testo in chunk con overlap configurabile |
| `RagService` | `backend/services/ragService.js` | Bridge verso ChromaDB (Python o HTTP), indicizzazione, query |
| `OllamaService` | `backend/services/ollamaService.js` | Chiamate a Ollama con timeout e gestione errori |
| `AssetMergeService` | `backend/services/assetMergeService.js` | Deduplicazione per similarità trigrammi + unione metadati |
| `AssetExtractionPipeline` | `backend/services/assetExtractionPipeline.js` | Orchestratore: coordina tutti i servizi in sequenza |

## Note di Configurazione
- **ChromaDB**: Collezione `methodology_dfd_base` per Fase 1. Ogni metodologia avanzata usa `methodology_{id}`.
- **Prompt**: Definiti in `backend/methodologies/manifest.json`, arricchiti dinamicamente con contesto RAG.
- **Fallback**: Se Ollama è irraggiungibile, la pipeline restituisce errore controllato senza crashare il backend.

> 📌 **Manutenzione**: Aggiornare questo diagramma quando si modifica il flusso di estrazione, si aggiungono nuovi formati documenti, o si cambia la logica di merging/RAG.