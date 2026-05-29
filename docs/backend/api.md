## Modules

<dl>
<dt><a href="#module_controllers/assetController">controllers/assetController</a></dt>
<dd><p>Controller per le operazioni sugli asset</p>
</dd>
<dt><a href="#module_controllers/assetExtractionController">controllers/assetExtractionController</a></dt>
<dd><p>Controller per l&#39;estrazione di asset via pipeline LLM</p>
</dd>
<dt><a href="#module_controllers/flowController">controllers/flowController</a></dt>
<dd><p>Controller per i flussi di dati</p>
</dd>
<dt><a href="#module_services/assetExtractionPipeline">services/assetExtractionPipeline</a></dt>
<dd><p>Orchestratore principale per l&#39;estrazione di asset da documenti</p>
</dd>
<dt><a href="#module_services/assetMergeService">services/assetMergeService</a></dt>
<dd><p>Servizio per il merging di asset per similarità (trigrammi)</p>
</dd>
<dt><a href="#module_services/assetService">services/assetService</a></dt>
<dd><p>Servizio per la gestione degli asset (business logic)</p>
</dd>
<dt><a href="#module_services/chunkService">services/chunkService</a></dt>
<dd><p>Servizio per la suddivisione di testi in chunk con overlap</p>
</dd>
<dt><a href="#module_services/flowService">services/flowService</a></dt>
<dd><p>Servizio per la gestione dei flussi di dati (Data Flow Diagram)</p>
</dd>
<dt><a href="#module_services/ollamaService">services/ollamaService</a></dt>
<dd><p>Servizio per la comunicazione con Ollama (LLM locale)</p>
</dd>
<dt><a href="#module_services/ragService">services/ragService</a></dt>
<dd><p>Servizio per interfacciarsi con ChromaDB (RAG)</p>
</dd>
<dt><a href="#module_services/textExtractorService">services/textExtractorService</a></dt>
<dd><p>Servizio per l&#39;estrazione di testo da formati documentali</p>
</dd>
<dt><a href="#module_models/assetModel">models/assetModel</a></dt>
<dd><p>Modello per la gestione del file threat-model.json</p>
</dd>
<dt><a href="#module_utils/configUtils">utils/configUtils</a></dt>
<dd><p>Utility per la gestione della configurazione</p>
</dd>
<dt><a href="#module_routes/analysis">routes/analysis</a></dt>
<dd><p>Route per le operazioni di analisi (estrazione asset)</p>
</dd>
</dl>

<a name="module_controllers/assetController"></a>

## controllers/assetController
Controller per le operazioni sugli asset


* [controllers/assetController](#module_controllers/assetController)
    * [~getAllAssets()](#module_controllers/assetController..getAllAssets)
    * [~createAsset()](#module_controllers/assetController..createAsset)
    * [~importAssets()](#module_controllers/assetController..importAssets)
    * [~updateAsset()](#module_controllers/assetController..updateAsset)
    * [~deleteAsset()](#module_controllers/assetController..deleteAsset)

<a name="module_controllers/assetController..getAllAssets"></a>

### controllers/assetController~getAllAssets()
GET /api/assets

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
<a name="module_controllers/assetController..createAsset"></a>

### controllers/assetController~createAsset()
POST /api/assets

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
<a name="module_controllers/assetController..importAssets"></a>

### controllers/assetController~importAssets()
POST /api/assets/import

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
<a name="module_controllers/assetController..updateAsset"></a>

### controllers/assetController~updateAsset()
PUT /api/assets/:id

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
<a name="module_controllers/assetController..deleteAsset"></a>

### controllers/assetController~deleteAsset()
DELETE /api/assets/:id

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
<a name="module_controllers/assetExtractionController"></a>

## controllers/assetExtractionController
Controller per l'estrazione di asset via pipeline LLM

<a name="module_controllers/assetExtractionController..extractAssets"></a>

### controllers/assetExtractionController~extractAssets(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Gestisce la richiesta POST /api/analyze/extract-assets

**Kind**: inner method of [<code>controllers/assetExtractionController</code>](#module_controllers/assetExtractionController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Request Express |
| res | <code>Object</code> | Response Express |

<a name="module_controllers/flowController"></a>

## controllers/flowController
Controller per i flussi di dati


* [controllers/flowController](#module_controllers/flowController)
    * [~getAllFlows()](#module_controllers/flowController..getAllFlows)
    * [~createFlow()](#module_controllers/flowController..createFlow)
    * [~updateFlow()](#module_controllers/flowController..updateFlow)
    * [~deleteFlow()](#module_controllers/flowController..deleteFlow)

<a name="module_controllers/flowController..getAllFlows"></a>

### controllers/flowController~getAllFlows()
GET /api/flows

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  
<a name="module_controllers/flowController..createFlow"></a>

### controllers/flowController~createFlow()
POST /api/flows

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  
<a name="module_controllers/flowController..updateFlow"></a>

### controllers/flowController~updateFlow()
PUT /api/flows/:id

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  
<a name="module_controllers/flowController..deleteFlow"></a>

### controllers/flowController~deleteFlow()
DELETE /api/flows/:id

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  
<a name="module_services/assetExtractionPipeline"></a>

## services/assetExtractionPipeline
Orchestratore principale per l'estrazione di asset da documenti

<a name="module_services/assetMergeService"></a>

## services/assetMergeService
Servizio per il merging di asset per similarità (trigrammi)


* [services/assetMergeService](#module_services/assetMergeService)
    * [~getTrigrams(str)](#module_services/assetMergeService..getTrigrams) ⇒ <code>Set.&lt;string&gt;</code>
    * [~calculateStringSimilarity(a, b)](#module_services/assetMergeService..calculateStringSimilarity) ⇒ <code>number</code>
    * [~mergeAssetsBySimilarity(assetsFromAllChunks)](#module_services/assetMergeService..mergeAssetsBySimilarity) ⇒ <code>Array.&lt;Object&gt;</code>

<a name="module_services/assetMergeService..getTrigrams"></a>

### services/assetMergeService~getTrigrams(str) ⇒ <code>Set.&lt;string&gt;</code>
Genera i trigrammi di una stringa

**Kind**: inner method of [<code>services/assetMergeService</code>](#module_services/assetMergeService)  
**Returns**: <code>Set.&lt;string&gt;</code> - Set di trigrammi  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | Stringa da processare |

<a name="module_services/assetMergeService..calculateStringSimilarity"></a>

### services/assetMergeService~calculateStringSimilarity(a, b) ⇒ <code>number</code>
Calcola la similarità tra due stringhe (coefficiente di Jaccard sui trigrammi)

**Kind**: inner method of [<code>services/assetMergeService</code>](#module_services/assetMergeService)  
**Returns**: <code>number</code> - Valore tra 0 e 1  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>string</code> | Prima stringa |
| b | <code>string</code> | Seconda stringa |

<a name="module_services/assetMergeService..mergeAssetsBySimilarity"></a>

### services/assetMergeService~mergeAssetsBySimilarity(assetsFromAllChunks) ⇒ <code>Array.&lt;Object&gt;</code>
Unisce asset per similarità dei nomi (soglia > 0.8) e aggrega i chunk di provenienza.

**Kind**: inner method of [<code>services/assetMergeService</code>](#module_services/assetMergeService)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Asset unici con campo evidence.chunks  

| Param | Type | Description |
| --- | --- | --- |
| assetsFromAllChunks | <code>Array.&lt;Object&gt;</code> | Array di asset con campi: name, category, description, chunkIndex |

<a name="module_services/assetService"></a>

## services/assetService
Servizio per la gestione degli asset (business logic)


* [services/assetService](#module_services/assetService)
    * [~getAllAssets()](#module_services/assetService..getAllAssets) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [~createAsset(assetData)](#module_services/assetService..createAsset) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~importAssets(assets)](#module_services/assetService..importAssets) ⇒ <code>Promise.&lt;{imported: number}&gt;</code>
    * [~updateAsset(id, updates)](#module_services/assetService..updateAsset) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~deleteAsset(id)](#module_services/assetService..deleteAsset) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>

<a name="module_services/assetService..getAllAssets"></a>

### services/assetService~getAllAssets() ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Recupera tutti gli asset dal modello persistente.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - Lista di asset.  
**Example**  
```js
const assets = await getAllAssets();
```
<a name="module_services/assetService..createAsset"></a>

### services/assetService~createAsset(assetData) ⇒ <code>Promise.&lt;Object&gt;</code>
Crea un nuovo asset e lo salva.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Asset creato, con `id` e `createdAt` generati.  
**Throws**:

- <code>Error</code> Se il salvataggio fallisce.


| Param | Type | Description |
| --- | --- | --- |
| assetData | <code>Object</code> | Dati dell'asset. |
| assetData.name | <code>string</code> | Nome dell'asset (obbligatorio). |
| assetData.category | <code>string</code> | Categoria (es. "External Entity", "Process", "Data Store"). |
| [assetData.description] | <code>string</code> | Descrizione opzionale. |

**Example**  
```js
const newAsset = await createAsset({ name: "Database", category: "Data Store" });
```
<a name="module_services/assetService..importAssets"></a>

### services/assetService~importAssets(assets) ⇒ <code>Promise.&lt;{imported: number}&gt;</code>
Importa una lista di asset (append semplice, senza deduplica).

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;{imported: number}&gt;</code> - Numero di asset importati.  

| Param | Type | Description |
| --- | --- | --- |
| assets | <code>Array.&lt;Object&gt;</code> | Lista di asset da importare. |

**Example**  
```js
const result = await importAssets([{ name: "API", category: "Process" }]);
```
<a name="module_services/assetService..updateAsset"></a>

### services/assetService~updateAsset(id, updates) ⇒ <code>Promise.&lt;Object&gt;</code>
Aggiorna un asset esistente.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Asset aggiornato.  
**Throws**:

- <code>Error</code> Se l'asset con l'ID specificato non esiste.


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID dell'asset da aggiornare. |
| updates | <code>Object</code> | Dati da aggiornare (name, category, description, ...). |

**Example**  
```js
const updated = await updateAsset("abc-123", { name: "Nuovo nome" });
```
<a name="module_services/assetService..deleteAsset"></a>

### services/assetService~deleteAsset(id) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>
Elimina un asset per ID.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Throws**:

- <code>Error</code> Se l'asset non esiste.


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID dell'asset da eliminare. |

<a name="module_services/chunkService"></a>

## services/chunkService
Servizio per la suddivisione di testi in chunk con overlap

<a name="module_services/chunkService..splitTextIntoChunks"></a>

### services/chunkService~splitTextIntoChunks(text, [maxChars], [overlapChars]) ⇒ <code>Array.&lt;{index: number, startChar: number, endChar: number, content: string}&gt;</code>
Suddivide un testo in chunk di dimensione massima, con overlap.

**Kind**: inner method of [<code>services/chunkService</code>](#module_services/chunkService)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| text | <code>string</code> |  | Testo da suddividere |
| [maxChars] | <code>number</code> | <code>1500</code> | Dimensione massima di ogni chunk in caratteri |
| [overlapChars] | <code>number</code> | <code>150</code> | Numero di caratteri di overlap tra chunk consecutivi |

<a name="module_services/flowService"></a>

## services/flowService
Servizio per la gestione dei flussi di dati (Data Flow Diagram)


* [services/flowService](#module_services/flowService)
    * [~getAllFlows()](#module_services/flowService..getAllFlows) ⇒ <code>Promise.&lt;Array&gt;</code>
    * [~createFlow(flowData)](#module_services/flowService..createFlow) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~updateFlow(id, updates)](#module_services/flowService..updateFlow) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~deleteFlow(id)](#module_services/flowService..deleteFlow) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>

<a name="module_services/flowService..getAllFlows"></a>

### services/flowService~getAllFlows() ⇒ <code>Promise.&lt;Array&gt;</code>
Recupera tutti i flussi

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Lista dei flussi  
<a name="module_services/flowService..createFlow"></a>

### services/flowService~createFlow(flowData) ⇒ <code>Promise.&lt;Object&gt;</code>
Crea un nuovo flusso

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Flusso creato  

| Param | Type | Description |
| --- | --- | --- |
| flowData | <code>Object</code> | Dati del flusso |
| flowData.name | <code>string</code> | Nome del flusso |
| flowData.source | <code>string</code> | ID o nome asset sorgente |
| flowData.target | <code>string</code> | ID o nome asset destinazione |
| [flowData.dataType] | <code>string</code> | Tipo di dati scambiati |
| [flowData.description] | <code>string</code> | Descrizione |

<a name="module_services/flowService..updateFlow"></a>

### services/flowService~updateFlow(id, updates) ⇒ <code>Promise.&lt;Object&gt;</code>
Aggiorna un flusso esistente

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Flusso aggiornato  
**Throws**:

- <code>Error</code> Se il flusso non esiste


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID del flusso |
| updates | <code>Object</code> | Dati da aggiornare |

<a name="module_services/flowService..deleteFlow"></a>

### services/flowService~deleteFlow(id) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>
Elimina un flusso

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Throws**:

- <code>Error</code> Se il flusso non esiste


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID del flusso |

<a name="module_services/ollamaService"></a>

## services/ollamaService
Servizio per la comunicazione con Ollama (LLM locale)

<a name="module_services/ollamaService..callOllama"></a>

### services/ollamaService~callOllama(prompt, config, [options]) ⇒ <code>Promise.&lt;string&gt;</code>
Chiamata a Ollama per completare un prompt.

**Kind**: inner method of [<code>services/ollamaService</code>](#module_services/ollamaService)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Risposta testuale  
**Throws**:

- <code>Error</code> Se Ollama non risponde o restituisce errore


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| prompt | <code>string</code> |  | Prompt da inviare |
| config | <code>Object</code> |  | Configurazione dell'applicazione (contiene ollama.baseUrl, model, timeout) |
| [options] | <code>Object</code> |  | Opzioni aggiuntive |
| [options.timeout] | <code>number</code> | <code>300000</code> | Timeout in ms (default 5 minuti) |
| [options.temperature] | <code>number</code> | <code>0.1</code> | Temperatura |
| [options.numPredict] | <code>number</code> | <code>256</code> | Token massimi da generare |
| [options.systemPrompt] | <code>string</code> |  | System prompt |

<a name="module_services/ragService"></a>

## services/ragService
Servizio per interfacciarsi con ChromaDB (RAG)


* [services/ragService](#module_services/ragService)
    * [~ChromaHttpClient](#module_services/ragService..ChromaHttpClient)
    * [~RagService](#module_services/ragService..RagService)
    * [~runPythonBridge(scriptPath, persistDir, command, payloadFile, pythonCmd, timeout)](#module_services/ragService..runPythonBridge) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~writeTempPayload(payload)](#module_services/ragService..writeTempPayload) ⇒ <code>Promise.&lt;string&gt;</code>

<a name="module_services/ragService..ChromaHttpClient"></a>

### services/ragService~ChromaHttpClient
Client per ChromaDB in modalità HTTP server

**Kind**: inner class of [<code>services/ragService</code>](#module_services/ragService)  
<a name="module_services/ragService..RagService"></a>

### services/ragService~RagService
Servizio RAG principale

**Kind**: inner class of [<code>services/ragService</code>](#module_services/ragService)  
<a name="module_services/ragService..runPythonBridge"></a>

### services/ragService~runPythonBridge(scriptPath, persistDir, command, payloadFile, pythonCmd, timeout) ⇒ <code>Promise.&lt;Object&gt;</code>
Esegue una chiamata al bridge Python (rag_bridge.py)

**Kind**: inner method of [<code>services/ragService</code>](#module_services/ragService)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| scriptPath | <code>string</code> |  | Percorso assoluto dello script |
| persistDir | <code>string</code> |  | Directory persistente ChromaDB |
| command | <code>string</code> |  | 'health', 'query', 'ingest' |
| payloadFile | <code>string</code> \| <code>null</code> | <code>null</code> | Percorso file payload (per query/ingest) |
| pythonCmd | <code>string</code> \| <code>null</code> | <code>null</code> | Interprete Python |
| timeout | <code>number</code> | <code>120000</code> | Timeout in ms |

<a name="module_services/ragService..writeTempPayload"></a>

### services/ragService~writeTempPayload(payload) ⇒ <code>Promise.&lt;string&gt;</code>
Scrive un payload JSON in un file temporaneo nella directory di sistema

**Kind**: inner method of [<code>services/ragService</code>](#module_services/ragService)  

| Param | Type |
| --- | --- |
| payload | <code>Object</code> | 

<a name="module_services/textExtractorService"></a>

## services/textExtractorService
Servizio per l'estrazione di testo da formati documentali


* [services/textExtractorService](#module_services/textExtractorService)
    * [~extractTextFromFile(filePath)](#module_services/textExtractorService..extractTextFromFile) ⇒ <code>Promise.&lt;string&gt;</code>
    * [~extractFromPDF(buffer)](#module_services/textExtractorService..extractFromPDF) ⇒ <code>Promise.&lt;string&gt;</code>
    * [~extractFromMarkdown(buffer)](#module_services/textExtractorService..extractFromMarkdown) ⇒ <code>Promise.&lt;string&gt;</code>
    * [~extractFromHTML(buffer)](#module_services/textExtractorService..extractFromHTML) ⇒ <code>Promise.&lt;string&gt;</code>
    * [~stripHtml(html)](#module_services/textExtractorService..stripHtml) ⇒ <code>string</code>

<a name="module_services/textExtractorService..extractTextFromFile"></a>

### services/textExtractorService~extractTextFromFile(filePath) ⇒ <code>Promise.&lt;string&gt;</code>
Estrae testo da un file in base all'estensione

**Kind**: inner method of [<code>services/textExtractorService</code>](#module_services/textExtractorService)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Testo estratto  
**Throws**:

- <code>Error</code> Se il formato non è supportato o la lettura fallisce


| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | Percorso assoluto del file |

<a name="module_services/textExtractorService..extractFromPDF"></a>

### services/textExtractorService~extractFromPDF(buffer) ⇒ <code>Promise.&lt;string&gt;</code>
Estrae testo da un PDF

**Kind**: inner method of [<code>services/textExtractorService</code>](#module_services/textExtractorService)  

| Param | Type |
| --- | --- |
| buffer | <code>Buffer</code> | 

<a name="module_services/textExtractorService..extractFromMarkdown"></a>

### services/textExtractorService~extractFromMarkdown(buffer) ⇒ <code>Promise.&lt;string&gt;</code>
Estrae testo da Markdown (converte in HTML e poi estrae il testo)

**Kind**: inner method of [<code>services/textExtractorService</code>](#module_services/textExtractorService)  

| Param | Type |
| --- | --- |
| buffer | <code>Buffer</code> | 

<a name="module_services/textExtractorService..extractFromHTML"></a>

### services/textExtractorService~extractFromHTML(buffer) ⇒ <code>Promise.&lt;string&gt;</code>
Estrae testo da HTML

**Kind**: inner method of [<code>services/textExtractorService</code>](#module_services/textExtractorService)  

| Param | Type |
| --- | --- |
| buffer | <code>Buffer</code> | 

<a name="module_services/textExtractorService..stripHtml"></a>

### services/textExtractorService~stripHtml(html) ⇒ <code>string</code>
Rimuove i tag HTML e normalizza spazi

**Kind**: inner method of [<code>services/textExtractorService</code>](#module_services/textExtractorService)  

| Param | Type |
| --- | --- |
| html | <code>string</code> | 

<a name="module_models/assetModel"></a>

## models/assetModel
Modello per la gestione del file threat-model.json


* [models/assetModel](#module_models/assetModel)
    * [~loadModel()](#module_models/assetModel..loadModel) ⇒ <code>Promise.&lt;{assets: Array, flows: Array}&gt;</code>
    * [~saveModel(model)](#module_models/assetModel..saveModel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_models/assetModel..loadModel"></a>

### models/assetModel~loadModel() ⇒ <code>Promise.&lt;{assets: Array, flows: Array}&gt;</code>
Carica il modello completo (assets + flows)

**Kind**: inner method of [<code>models/assetModel</code>](#module_models/assetModel)  
<a name="module_models/assetModel..saveModel"></a>

### models/assetModel~saveModel(model) ⇒ <code>Promise.&lt;void&gt;</code>
Salva il modello completo

**Kind**: inner method of [<code>models/assetModel</code>](#module_models/assetModel)  

| Param | Type | Description |
| --- | --- | --- |
| model | <code>Object</code> | Modello da salvare |

<a name="module_utils/configUtils"></a>

## utils/configUtils
Utility per la gestione della configurazione

<a name="module_routes/analysis"></a>

## routes/analysis
Route per le operazioni di analisi (estrazione asset)

