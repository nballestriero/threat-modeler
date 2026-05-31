## Modules

<dl>
<dt><a href="#module_controllers/assetController">controllers/assetController</a></dt>
<dd><p>Gestisce le richieste REST per gli asset, delegando la business logic
a <a href="../services/assetService">../services/assetService</a>. Include validazione input, gestione errori
e mappatura a codici HTTP appropriati. Supporta isolamento dati per progetto
tramite <code>req.projectDir</code>.</p>
</dd>
<dt><a href="#module_controllers/assetExtractionController">controllers/assetExtractionController</a></dt>
<dd><p>Controller per l&#39;estrazione di asset via pipeline LLM</p>
</dd>
<dt><a href="#module_controllers/assetSuggestionController">controllers/assetSuggestionController</a></dt>
<dd><p>Controller per l&#39;endpoint di suggerimento asset</p>
</dd>
<dt><a href="#module_controllers/flowController">controllers/flowController</a></dt>
<dd><p>Gestisce le richieste HTTP per i flussi, con validazione delle regole DFD Base:</p>
<ul>
<li>External Entity non può collegarsi direttamente a External Entity</li>
<li>Data Store deve collegarsi solo a un Process</li>
<li>Validazione campi obbligatori e (in produzione) esistenza asset</li>
</ul>
</dd>
<dt><a href="#module_services/assetExtractionPipeline">services/assetExtractionPipeline</a></dt>
<dd><p>Orchestratore principale per l&#39;estrazione di asset da documenti</p>
</dd>
<dt><a href="#module_services/assetMergeService">services/assetMergeService</a></dt>
<dd><p>Servizio per il merging di asset per similarità (trigrammi)</p>
</dd>
<dt><a href="#module_services/assetService">services/assetService</a></dt>
<dd><p>Gestisce le operazioni CRUD per gli asset DFD, operando sul modello JSON condiviso
con i flussi. Supporta l&#39;isolamento dei dati per progetto tramite <code>projectDir</code>.</p>
<h2 id="struttura-dati-asset">Struttura dati asset</h2>
<pre><code class="language-json">{
  &quot;id&quot;: &quot;uuid-v4&quot;,
  &quot;name&quot;: &quot;Nome dell&#39;asset&quot;,
  &quot;category&quot;: &quot;External Entity|Process|Data Store&quot;,
  &quot;description&quot;: &quot;Descrizione opzionale&quot;,
  &quot;createdAt&quot;: &quot;ISO-8601 timestamp&quot;,
  &quot;evidence&quot;: { ... } // Metadati opzionali per tracciabilità RAG
}
</code></pre>
</dd>
<dt><a href="#module_services/assetSuggestionService">services/assetSuggestionService</a></dt>
<dd><p>Servizio per generare suggerimenti di miglioramento per un asset usando Ollama</p>
</dd>
<dt><a href="#module_services/chunkService">services/chunkService</a></dt>
<dd><p>Servizio per la suddivisione di testi in chunk con overlap</p>
</dd>
<dt><a href="#module_services/flowService">services/flowService</a></dt>
<dd><p>Gestisce le operazioni CRUD per i flussi DFD, operando sul modello JSON condiviso
con gli asset. Supporta l&#39;isolamento dei dati per progetto tramite <code>projectDir</code>.</p>
<h2 id="struttura-dati-flusso">Struttura dati flusso</h2>
<pre><code class="language-json">{
  &quot;id&quot;: &quot;uuid-v4&quot;,
  &quot;fromId&quot;: &quot;asset-source-id&quot;,
  &quot;toId&quot;: &quot;asset-destination-id&quot;,
  &quot;label&quot;: &quot;Etichetta del flusso&quot;,
  &quot;description&quot;: &quot;Descrizione opzionale&quot;,
  &quot;createdAt&quot;: &quot;ISO-8601 timestamp&quot;
}
</code></pre>
</dd>
<dt><a href="#module_services/ollamaService">services/ollamaService</a></dt>
<dd><p>Servizio per la comunicazione con Ollama (LLM locale)</p>
</dd>
<dt><a href="#module_services/projectService">services/projectService</a></dt>
<dd><p>Gestisce il ciclo di vita dei progetti nell&#39;applicazione threat-modeler:</p>
<ul>
<li>Creazione con attivazione automatica e inizializzazione directory isolata</li>
<li>Lettura/Scrittura della lista progetti da <code>projects.json</code></li>
<li>Gestione stati: <code>draft</code>, <code>active</code>, <code>archived</code></li>
<li>Isolamento dati: ogni progetto ha la sua cartella con <code>threat-model.json</code>, <code>config.json</code></li>
</ul>
<h2 id="struttura-dati-progetto">Struttura dati progetto</h2>
<pre><code class="language-json">{
  &quot;id&quot;: &quot;uuid-v4&quot;,
  &quot;name&quot;: &quot;Nome Progetto&quot;,
  &quot;description&quot;: &quot;Descrizione opzionale&quot;,
  &quot;owner&quot;: &quot;Proprietario opzionale&quot;,
  &quot;status&quot;: &quot;active|draft|archived&quot;,
  &quot;createdAt&quot;: &quot;ISO-8601 timestamp&quot;,
  &quot;updatedAt&quot;: &quot;ISO-8601 timestamp&quot;
}
</code></pre>
<h2 id="isolamento-dati-per-progetto">Isolamento dati per progetto</h2>
<p>Quando un progetto viene creato, viene generata una directory dedicata:</p>
<pre><code>backend/data/
├── projects.json                    # Lista metadata progetti
└── &lt;project-uuid&gt;/                 # Directory isolata del progetto
    ├── threat-model.json           # Asset e flussi del progetto
    └── config.json                 # Configurazione specifica del progetto
</code></pre>
</dd>
<dt><a href="#module_services/ragService">services/ragService</a></dt>
<dd><p>Servizio per interfacciarsi con ChromaDB (RAG)</p>
</dd>
<dt><a href="#module_services/textExtractorService">services/textExtractorService</a></dt>
<dd><p>Servizio per l&#39;estrazione di testo da formati documentali</p>
</dd>
<dt><a href="#module_models/assetModel">models/assetModel</a></dt>
<dd><p>Gestisce la lettura e scrittura del modello dati principale (asset + flussi)
con supporto per percorsi dinamici. Permette l&#39;isolamento dei dati per progetto
accettando un <code>projectDir</code> opzionale.</p>
<h2 id="supporto-multi-progetto">Supporto multi-progetto</h2>
<p>Quando viene passato <code>projectDir</code>, il modello opera nella directory isolata
del progetto specifico:</p>
<pre><code>backend/data/&lt;project-uuid&gt;/threat-model.json
</code></pre>
<p>Se <code>projectDir</code> è <code>null</code> o <code>undefined</code>, usa la directory di fallback:</p>
<pre><code>backend/data/threat-model.json
</code></pre>
<h2 id="struttura-del-modello">Struttura del modello</h2>
<pre><code class="language-json">{
  &quot;assets&quot;: [
    { &quot;id&quot;: &quot;uuid&quot;, &quot;name&quot;: &quot;Asset Name&quot;, &quot;category&quot;: &quot;Process&quot;, ... }
  ],
  &quot;flows&quot;: [
    { &quot;id&quot;: &quot;uuid&quot;, &quot;fromId&quot;: &quot;asset-id&quot;, &quot;toId&quot;: &quot;asset-id&quot;, &quot;label&quot;: &quot;Flow Label&quot; }
  ]
}
</code></pre>
</dd>
<dt><a href="#module_utils/configUtils">utils/configUtils</a></dt>
<dd><p>Utility per la gestione della configurazione</p>
</dd>
<dt><a href="#module_utils/errorHandler">utils/errorHandler</a></dt>
<dd><p>Middleware centralizzato per la gestione degli errori</p>
</dd>
<dt><a href="#module_routes/analysis">routes/analysis</a></dt>
<dd><p>Route per le operazioni di analisi (estrazione asset)</p>
</dd>
<dt><a href="#module_routes/assets">routes/assets</a></dt>
<dd><p>Gestisce tutte le operazioni CRUD per asset e flussi, più endpoint avanzati
per importazione bulk e suggerimenti AI.</p>
<h2 id="endpoint-gestiti">Endpoint gestiti</h2>
<table>
<thead>
<tr>
<th>Metodo</th>
<th>Endpoint</th>
<th>Descrizione</th>
</tr>
</thead>
<tbody><tr>
<td>GET</td>
<td><code>/api/assets</code></td>
<td>Recupera tutti gli asset</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/assets</code></td>
<td>Crea un nuovo asset</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/assets/import</code></td>
<td>Importa asset in blocco (LLM extraction)</td>
</tr>
<tr>
<td>PUT</td>
<td><code>/api/assets/:id</code></td>
<td>Aggiorna un asset esistente</td>
</tr>
<tr>
<td>DELETE</td>
<td><code>/api/assets/:id</code></td>
<td>Elimina un asset (cascade delete flussi orfani)</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/assets/:id/suggest</code></td>
<td>Suggerimenti AI per migliorare un asset</td>
</tr>
<tr>
<td>GET</td>
<td><code>/api/flows</code></td>
<td>Recupera tutti i flussi</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/flows</code></td>
<td>Crea un nuovo flusso</td>
</tr>
<tr>
<td>PUT</td>
<td><code>/api/flows/:id</code></td>
<td>Aggiorna un flusso esistente</td>
</tr>
<tr>
<td>DELETE</td>
<td><code>/api/flows/:id</code></td>
<td>Elimina un flusso</td>
</tr>
</tbody></table>
</dd>
<dt><a href="#module_routes/projects">routes/projects</a></dt>
<dd><p>Gestisce tutte le operazioni CRUD per i progetti, inclusa l&#39;attivazione/archiviazione.
Le rotte operano su <code>projects.json</code> e creano directory isolate per ogni progetto.</p>
<h2 id="endpoint-gestiti">Endpoint gestiti</h2>
<table>
<thead>
<tr>
<th>Metodo</th>
<th>Endpoint</th>
<th>Descrizione</th>
</tr>
</thead>
<tbody><tr>
<td>GET</td>
<td><code>/api/projects</code></td>
<td>Recupera lista progetti</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/projects</code></td>
<td>Crea nuovo progetto (auto-attivato)</td>
</tr>
<tr>
<td>PUT</td>
<td><code>/api/projects/:id</code></td>
<td>Aggiorna metadati progetto</td>
</tr>
<tr>
<td>POST</td>
<td><code>/api/projects/:id/status</code></td>
<td>Cambia stato progetto (draft/active/archived)</td>
</tr>
</tbody></table>
</dd>
</dl>

<a name="module_controllers/assetController"></a>

## controllers/assetController
Gestisce le richieste REST per gli asset, delegando la business logica [../services/assetService](../services/assetService). Include validazione input, gestione errorie mappatura a codici HTTP appropriati. Supporta isolamento dati per progettotramite `req.projectDir`.

**See**

- [../services/assetService.js](../services/assetService.js) Business logic per asset
- [../middleware/projectScope.js](../middleware/projectScope.js) Middleware che inietta req.projectDir


* [controllers/assetController](#module_controllers/assetController)
    * [~getAllAssets(req, res)](#module_controllers/assetController..getAllAssets) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~createAsset(req, res)](#module_controllers/assetController..createAsset) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~importAssets(req, res)](#module_controllers/assetController..importAssets) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateAsset(req, res)](#module_controllers/assetController..updateAsset) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~deleteAsset(req, res)](#module_controllers/assetController..deleteAsset) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_controllers/assetController..getAllAssets"></a>

### controllers/assetController~getAllAssets(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Recupera tutti gli asset e restituisce lista JSON.

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
**Route**: GET /api/assets  
**Response**: <code>200</code> Array<Asset> - Lista completa degli asset  
**Response**: <code>500</code> { error: string } - Errore interno del server  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request object |
| [req.projectDir] | <code>string</code> | Directory del progetto attivo (iniettata da middleware) |
| res | <code>Object</code> | Express response object |

<a name="module_controllers/assetController..createAsset"></a>

### controllers/assetController~createAsset(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Crea un nuovo asset con validazione input.

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
**Route**: POST /api/assets  
**Requestbody**: <code>Object</code> Asset senza id  
**Response**: <code>201</code> Asset - Asset creato con id generato  
**Response**: <code>400</code> { error: string, field?: string } - Validazione fallita  
**Response**: <code>500</code> { error: string } - Errore interno del server  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request object |
| req.body | <code>Object</code> | Dati dell'asset da creare |
| req.body.name | <code>string</code> | Nome dell'asset (obbligatorio) |
| req.body.category | <code>string</code> | Categoria DFD (obbligatoria) |
| [req.body.description] | <code>string</code> | Descrizione opzionale |
| [req.projectDir] | <code>string</code> | Directory del progetto attivo |
| res | <code>Object</code> | Express response object |

<a name="module_controllers/assetController..importAssets"></a>

### controllers/assetController~importAssets(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Importa asset in blocco da estrazione LLM/RAG.

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
**Route**: POST /api/assets/import  
**Requestbody**: <code>Object</code> { assets: Array<Asset> }  
**Response**: <code>200</code> { saved: number, duplicates: number } - Riepilogo importazione  
**Response**: <code>400</code> { error: string } - Formato payload non valido  
**Response**: <code>500</code> { error: string } - Errore interno del server  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request object |
| req.body.assets | <code>Array.&lt;Asset&gt;</code> | Lista di asset da importare |
| [req.projectDir] | <code>string</code> | Directory del progetto attivo |
| res | <code>Object</code> | Express response object |

<a name="module_controllers/assetController..updateAsset"></a>

### controllers/assetController~updateAsset(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Aggiorna un asset esistente per ID.

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
**Route**: PUT /api/assets/:id  
**Requestbody**: <code>Object</code> Campi da aggiornare (name, category, description)  
**Response**: <code>200</code> Asset - Asset aggiornato  
**Response**: <code>400</code> { error: string } - Validazione fallita  
**Response**: <code>404</code> { error: string } - Asset non trovato  
**Response**: <code>500</code> { error: string } - Errore interno del server  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request object |
| req.params | <code>Object</code> | Parametri URL |
| req.params.id | <code>string</code> | ID dell'asset da aggiornare |
| req.body | <code>Object</code> | Campi da aggiornare (parziali) |
| [req.projectDir] | <code>string</code> | Directory del progetto attivo |
| res | <code>Object</code> | Express response object |

<a name="module_controllers/assetController..deleteAsset"></a>

### controllers/assetController~deleteAsset(req, res) ⇒ <code>Promise.&lt;void&gt;</code>
Elimina un asset per ID con cascade delete per flussi orfani.

**Kind**: inner method of [<code>controllers/assetController</code>](#module_controllers/assetController)  
**Route**: DELETE /api/assets/:id  
**Response**: <code>200</code> { success: true, message: string, orphanFlowsDeleted: number } - Eliminazione confermata con conteggio flussi rimossi  
**Response**: <code>404</code> { error: string } - Asset non trovato  
**Response**: <code>500</code> { error: string } - Errore interno del server  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request object |
| req.params | <code>Object</code> | Parametri URL |
| req.params.id | <code>string</code> | ID dell'asset da eliminare |
| [req.projectDir] | <code>string</code> | Directory del progetto attivo |
| res | <code>Object</code> | Express response object |

**Example**  
```js
// Request: DELETE /api/assets/abc-123// Response: 200 OK{  "success": true,  "message": "Asset abc-123 eliminato",  "orphanFlowsDeleted": 2}
```
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

<a name="module_controllers/assetSuggestionController"></a>

## controllers/assetSuggestionController
Controller per l'endpoint di suggerimento asset

<a name="module_controllers/assetSuggestionController..suggestAsset"></a>

### controllers/assetSuggestionController~suggestAsset(req, res)
POST /api/assets/:id/suggest

**Kind**: inner method of [<code>controllers/assetSuggestionController</code>](#module_controllers/assetSuggestionController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Request Express |
| res | <code>Object</code> | Response Express |

<a name="module_controllers/flowController"></a>

## controllers/flowController
Gestisce le richieste HTTP per i flussi, con validazione delle regole DFD Base:- External Entity non può collegarsi direttamente a External Entity- Data Store deve collegarsi solo a un Process- Validazione campi obbligatori e (in produzione) esistenza asset

**See**

- [../services/assetService.js](../services/assetService.js) Service per logica business
- [../models/assetModel.js](../models/assetModel.js) Modello dati condiviso


* [controllers/flowController](#module_controllers/flowController)
    * [~validateDfdFlow(flowData, assets, isTest)](#module_controllers/flowController..validateDfdFlow)
    * [~getAllFlows(req, res)](#module_controllers/flowController..getAllFlows)
    * [~createFlow(req, res)](#module_controllers/flowController..createFlow)
    * [~updateFlow(req, res)](#module_controllers/flowController..updateFlow)
    * [~deleteFlow(req, res)](#module_controllers/flowController..deleteFlow)

<a name="module_controllers/flowController..validateDfdFlow"></a>

### controllers/flowController~validateDfdFlow(flowData, assets, isTest)
Valida le regole DFD Base per un flusso.

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  
**Throws**:

- <code>Error</code> Se il flusso viola le regole DFD


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| flowData | <code>Object</code> |  | Dati del flusso |
| assets | <code>Array</code> |  | Lista asset del progetto |
| isTest | <code>boolean</code> | <code>false</code> | Se true, salta la verifica esistenza asset (per test) |

<a name="module_controllers/flowController..getAllFlows"></a>

### controllers/flowController~getAllFlows(req, res)
Recupera tutti i flussi del progetto attivo.

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request |
| [req.projectDir] | <code>string</code> | Directory del progetto |
| res | <code>Object</code> | Express response |

<a name="module_controllers/flowController..createFlow"></a>

### controllers/flowController~createFlow(req, res)
Crea un nuovo flusso con validazione DFD.

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request |
| req.body | <code>Object</code> | Dati del flusso |
| req.body.fromId | <code>string</code> | ID asset sorgente |
| req.body.toId | <code>string</code> | ID asset destinazione |
| req.body.label | <code>string</code> | Etichetta del flusso |
| [req.projectDir] | <code>string</code> | Directory del progetto |
| res | <code>Object</code> | Express response |

<a name="module_controllers/flowController..updateFlow"></a>

### controllers/flowController~updateFlow(req, res)
Aggiorna un flusso esistente.

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request |
| res | <code>Object</code> | Express response |

<a name="module_controllers/flowController..deleteFlow"></a>

### controllers/flowController~deleteFlow(req, res)
Elimina un flusso.

**Kind**: inner method of [<code>controllers/flowController</code>](#module_controllers/flowController)  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>Object</code> | Express request |
| res | <code>Object</code> | Express response |

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
Gestisce le operazioni CRUD per gli asset DFD, operando sul modello JSON condivisocon i flussi. Supporta l'isolamento dei dati per progetto tramite `projectDir`.## Struttura dati asset```json{  "id": "uuid-v4",  "name": "Nome dell'asset",  "category": "External Entity|Process|Data Store",  "description": "Descrizione opzionale",  "createdAt": "ISO-8601 timestamp",  "evidence": { ... } // Metadati opzionali per tracciabilità RAG}```

**See**

- [../models/assetModel.js](../models/assetModel.js) Modello dati condiviso asset+flows
- [../middleware/projectScope.js](../middleware/projectScope.js) Middleware che inietta req.projectDir


* [services/assetService](#module_services/assetService)
    * [~getAllAssets([projectDir])](#module_services/assetService..getAllAssets) ⇒ <code>Promise.&lt;Array.&lt;Asset&gt;&gt;</code>
    * [~createAsset(assetData, [projectDir])](#module_services/assetService..createAsset) ⇒ <code>Promise.&lt;Asset&gt;</code>
    * [~updateAsset(id, updates, [projectDir])](#module_services/assetService..updateAsset) ⇒ <code>Promise.&lt;Asset&gt;</code>
    * [~deleteAsset(id, [projectDir])](#module_services/assetService..deleteAsset) ⇒ <code>Promise.&lt;{orphanFlowsDeleted: number}&gt;</code>
    * [~importAssets(assets, [projectDir])](#module_services/assetService..importAssets) ⇒ <code>Promise.&lt;{saved: number, duplicates: number}&gt;</code>
    * [~Asset](#module_services/assetService..Asset) : <code>Object</code>

<a name="module_services/assetService..getAllAssets"></a>

### services/assetService~getAllAssets([projectDir]) ⇒ <code>Promise.&lt;Array.&lt;Asset&gt;&gt;</code>
Recupera tutti gli asset dal modello persistente del progetto specifico.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Array.&lt;Asset&gt;&gt;</code> - Lista di asset, o array vuoto se nessuno presente  

| Param | Type | Description |
| --- | --- | --- |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const assets = await getAllAssets(req.projectDir);console.log(assets.map(a => a.name));
```
<a name="module_services/assetService..createAsset"></a>

### services/assetService~createAsset(assetData, [projectDir]) ⇒ <code>Promise.&lt;Asset&gt;</code>
Crea un nuovo asset nel progetto specifico.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Asset&gt;</code> - Asset creato con ID generato e timestamp  
**Throws**:

- <code>Error</code> Se il campo name è mancante o vuoto


| Param | Type | Description |
| --- | --- | --- |
| assetData | <code>Object</code> | Dati dell'asset da creare |
| assetData.name | <code>string</code> | Nome dell'asset (obbligatorio) |
| assetData.category | <code>string</code> | Categoria DFD (obbligatoria) |
| [assetData.description] | <code>string</code> | Descrizione opzionale |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const asset = await createAsset({  name: 'API Gateway',  category: 'Process',  description: 'Punto di ingresso per le richieste esterne'}, req.projectDir);
```
<a name="module_services/assetService..updateAsset"></a>

### services/assetService~updateAsset(id, updates, [projectDir]) ⇒ <code>Promise.&lt;Asset&gt;</code>
Aggiorna un asset esistente nel progetto specifico.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;Asset&gt;</code> - Asset aggiornato con tutti i campi  
**Throws**:

- <code>Error</code> Se l'asset con l'ID specificato non viene trovato


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID dell'asset da aggiornare |
| updates | <code>Object</code> | Campi da modificare (parziali) |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const updated = await updateAsset('asset-123', {  name: 'API Gateway Produzione',  description: 'Aggiornato con rate limiting'}, req.projectDir);
```
<a name="module_services/assetService..deleteAsset"></a>

### services/assetService~deleteAsset(id, [projectDir]) ⇒ <code>Promise.&lt;{orphanFlowsDeleted: number}&gt;</code>
Elimina un asset nel progetto specifico con cascade delete per flussi orfani.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;{orphanFlowsDeleted: number}&gt;</code> - Conteggio flussi eliminati  
**Throws**:

- <code>Error</code> Se l'asset con l'ID specificato non viene trovato


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID dell'asset da eliminare |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const result = await deleteAsset('asset-123', req.projectDir);console.log(`Flussi orfani eliminati: ${result.orphanFlowsDeleted}`);
```
<a name="module_services/assetService..importAssets"></a>

### services/assetService~importAssets(assets, [projectDir]) ⇒ <code>Promise.&lt;{saved: number, duplicates: number}&gt;</code>
Importa asset in blocco nel progetto specifico con deduplica per nome.

**Kind**: inner method of [<code>services/assetService</code>](#module_services/assetService)  
**Returns**: <code>Promise.&lt;{saved: number, duplicates: number}&gt;</code> - Conteggio asset salvati e duplicati ignorati  

| Param | Type | Description |
| --- | --- | --- |
| assets | <code>Array.&lt;Object&gt;</code> | Lista di asset da importare |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const result = await importAssets([  { name: 'API Gateway', category: 'Process' },  { name: 'Database', category: 'Data Store' }], req.projectDir);console.log(`Salvati: ${result.saved}, Duplicati: ${result.duplicates}`);
```
<a name="module_services/assetService..Asset"></a>

### services/assetService~Asset : <code>Object</code>
**Kind**: inner typedef of [<code>services/assetService</code>](#module_services/assetService)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Identificativo univoco UUID v4 |
| name | <code>string</code> | Nome dell'asset (obbligatorio) |
| category | <code>string</code> | Categoria DFD: 'External Entity' | 'Process' | 'Data Store' |
| [description] | <code>string</code> | Descrizione opzionale |
| createdAt | <code>string</code> | Timestamp ISO di creazione |
| [evidence] | <code>Object</code> | Metadati opzionali per tracciabilità RAG |

<a name="module_services/assetSuggestionService"></a>

## services/assetSuggestionService
Servizio per generare suggerimenti di miglioramento per un asset usando Ollama

<a name="module_services/assetSuggestionService..suggestAssetImprovements"></a>

### services/assetSuggestionService~suggestAssetImprovements(assetId, config) ⇒ <code>Promise.&lt;{name: string, category: string, description: string}&gt;</code>
Genera suggerimenti per migliorare un asset basandosi sul contesto e sulla tassonomia.

**Kind**: inner method of [<code>services/assetSuggestionService</code>](#module_services/assetSuggestionService)  

| Param | Type | Description |
| --- | --- | --- |
| assetId | <code>string</code> | ID dell'asset |
| config | <code>Object</code> | Configurazione dell'app (per Ollama) |

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
Gestisce le operazioni CRUD per i flussi DFD, operando sul modello JSON condivisocon gli asset. Supporta l'isolamento dei dati per progetto tramite `projectDir`.## Struttura dati flusso```json{  "id": "uuid-v4",  "fromId": "asset-source-id",  "toId": "asset-destination-id",  "label": "Etichetta del flusso",  "description": "Descrizione opzionale",  "createdAt": "ISO-8601 timestamp"}```

**See**

- [../models/assetModel.js](../models/assetModel.js) Modello dati condiviso asset+flows
- [../middleware/projectScope.js](../middleware/projectScope.js) Middleware che inietta req.projectDir


* [services/flowService](#module_services/flowService)
    * [~getAllFlows([projectDir])](#module_services/flowService..getAllFlows) ⇒ <code>Promise.&lt;Array.&lt;Flow&gt;&gt;</code>
    * [~createFlow(flowData, [projectDir])](#module_services/flowService..createFlow) ⇒ <code>Promise.&lt;Flow&gt;</code>
    * [~updateFlow(id, updates, [projectDir])](#module_services/flowService..updateFlow) ⇒ <code>Promise.&lt;Flow&gt;</code>
    * [~deleteFlow(id, [projectDir])](#module_services/flowService..deleteFlow) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>
    * [~Flow](#module_services/flowService..Flow) : <code>Object</code>

<a name="module_services/flowService..getAllFlows"></a>

### services/flowService~getAllFlows([projectDir]) ⇒ <code>Promise.&lt;Array.&lt;Flow&gt;&gt;</code>
Recupera tutti i flussi dal modello del progetto specifico.

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Array.&lt;Flow&gt;&gt;</code> - Lista di flussi, o array vuoto se nessuno presente  

| Param | Type | Description |
| --- | --- | --- |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const flows = await getAllFlows(req.projectDir);console.log(flows.map(f => f.label));
```
<a name="module_services/flowService..createFlow"></a>

### services/flowService~createFlow(flowData, [projectDir]) ⇒ <code>Promise.&lt;Flow&gt;</code>
Crea un nuovo flusso nel progetto specifico.

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Flow&gt;</code> - Flusso creato con ID generato e timestamp  

| Param | Type | Description |
| --- | --- | --- |
| flowData | <code>Object</code> | Dati del flusso da creare |
| flowData.fromId | <code>string</code> | ID dell'asset sorgente |
| flowData.toId | <code>string</code> | ID dell'asset destinazione |
| flowData.label | <code>string</code> | Etichetta del flusso |
| [flowData.description] | <code>string</code> | Descrizione opzionale |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const flow = await createFlow({  fromId: 'asset-123',  toId: 'asset-456',  label: 'HTTPS Request'}, req.projectDir);
```
<a name="module_services/flowService..updateFlow"></a>

### services/flowService~updateFlow(id, updates, [projectDir]) ⇒ <code>Promise.&lt;Flow&gt;</code>
Aggiorna un flusso esistente nel progetto specifico.

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;Flow&gt;</code> - Flusso aggiornato con tutti i campi  
**Throws**:

- <code>Error</code> Se il flusso con l'ID specificato non viene trovato


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID del flusso da aggiornare |
| updates | <code>Object</code> | Campi da modificare (parziali) |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const updated = await updateFlow('flow-123', {  label: 'HTTPS Encrypted',  description: 'Aggiornato con TLS 1.3'}, req.projectDir);
```
<a name="module_services/flowService..deleteFlow"></a>

### services/flowService~deleteFlow(id, [projectDir]) ⇒ <code>Promise.&lt;{success: boolean}&gt;</code>
Elimina un flusso nel progetto specifico.

**Kind**: inner method of [<code>services/flowService</code>](#module_services/flowService)  
**Returns**: <code>Promise.&lt;{success: boolean}&gt;</code> - Conferma eliminazione  
**Throws**:

- <code>Error</code> Se il flusso con l'ID specificato non viene trovato


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID del flusso da eliminare |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
const result = await deleteFlow('flow-123', req.projectDir);console.log(result.success); // → true
```
<a name="module_services/flowService..Flow"></a>

### services/flowService~Flow : <code>Object</code>
**Kind**: inner typedef of [<code>services/flowService</code>](#module_services/flowService)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Identificativo univoco UUID v4 |
| fromId | <code>string</code> | ID dell'asset sorgente |
| toId | <code>string</code> | ID dell'asset destinazione |
| label | <code>string</code> | Etichetta del flusso |
| [description] | <code>string</code> | Descrizione opzionale |
| createdAt | <code>string</code> | Timestamp ISO di creazione |

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

<a name="module_services/projectService"></a>

## services/projectService
Gestisce il ciclo di vita dei progetti nell'applicazione threat-modeler:- Creazione con attivazione automatica e inizializzazione directory isolata- Lettura/Scrittura della lista progetti da `projects.json`- Gestione stati: `draft`, `active`, `archived`- Isolamento dati: ogni progetto ha la sua cartella con `threat-model.json`, `config.json`## Struttura dati progetto```json{  "id": "uuid-v4",  "name": "Nome Progetto",  "description": "Descrizione opzionale",  "owner": "Proprietario opzionale",  "status": "active|draft|archived",  "createdAt": "ISO-8601 timestamp",  "updatedAt": "ISO-8601 timestamp"}```## Isolamento dati per progettoQuando un progetto viene creato, viene generata una directory dedicata:```backend/data/├── projects.json                    # Lista metadata progetti└── <project-uuid>/                 # Directory isolata del progetto    ├── threat-model.json           # Asset e flussi del progetto    └── config.json                 # Configurazione specifica del progetto```

**See**

- [../middleware/projectScope.js](../middleware/projectScope.js) Middleware che usa questo service
- [../models/assetModel.js](../models/assetModel.js) Modello dati che supporta percorsi dinamici


* [services/projectService](#module_services/projectService)
    * [.getAllProjects()](#module_services/projectService.getAllProjects) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.createProject(data)](#module_services/projectService.createProject) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.updateProject(id, updates)](#module_services/projectService.updateProject) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.setStatus(id, newStatus)](#module_services/projectService.setStatus) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getActiveProjectDir()](#module_services/projectService.getActiveProjectDir) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
    * [.getProjectDir(projectId)](#module_services/projectService.getProjectDir) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>

<a name="module_services/projectService.getAllProjects"></a>

### services/projectService.getAllProjects() ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Recupera la lista completa di tutti i progetti.

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - Lista di progetti con tutti i metadati  
**Example**  
```js
const projects = await projectService.getAllProjects();console.log(projects.map(p => p.name));
```
<a name="module_services/projectService.createProject"></a>

### services/projectService.createProject(data) ⇒ <code>Promise.&lt;Object&gt;</code>
Crea un nuovo progetto e lo imposta AUTOMATICAMENTE come attivo.Disattiva eventuali progetti attivi preesistenti (un solo progetto attivo alla volta).

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Il progetto creato con ID generato e timestamp  
**Throws**:

- <code>Error</code> Se la scrittura del file fallisce


| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Dati per la creazione del progetto |
| data.name | <code>string</code> | Nome del progetto (obbligatorio, viene trimmato) |
| [data.description] | <code>string</code> | Descrizione opzionale |
| [data.owner] | <code>string</code> | Proprietario opzionale |

**Example**  
```js
const project = await projectService.createProject({  name: 'Analisi Sistema Bancario',  description: 'Threat modeling per l'app mobile',  owner: 'Security Team'});console.log(project.id); // → 'a1b2c3d4-...'console.log(project.status); // → 'active' (auto-attivato)
```
<a name="module_services/projectService.updateProject"></a>

### services/projectService.updateProject(id, updates) ⇒ <code>Promise.&lt;Object&gt;</code>
Aggiorna i metadati di un progetto esistente.Non permette la modifica diretta di `id` o `status` (usare setStatus per quello).

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Il progetto aggiornato con timestamp aggiornato  
**Throws**:

- <code>Error</code> Se il progetto non viene trovato


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID univoco del progetto da aggiornare |
| updates | <code>Object</code> | Campi da aggiornare (name, description, owner) |

**Example**  
```js
const updated = await projectService.updateProject('uuid-123', {  name: 'Nome Aggiornato',  description: 'Nuova descrizione'});
```
<a name="module_services/projectService.setStatus"></a>

### services/projectService.setStatus(id, newStatus) ⇒ <code>Promise.&lt;Object&gt;</code>
Cambia lo stato di un progetto (draft → active → archived).Se si imposta `active`, disattiva automaticamente gli altri progetti.

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Il progetto aggiornato con il nuovo stato  
**Throws**:

- <code>Error</code> Se lo stato non è valido o il progetto non esiste


| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | ID univoco del progetto |
| newStatus | <code>&#x27;draft&#x27;</code> \| <code>&#x27;active&#x27;</code> \| <code>&#x27;archived&#x27;</code> | Nuovo stato da assegnare |

**Example**  
```js
// Archivia un progettoawait projectService.setStatus('uuid-123', 'archived');// Attiva un progetto (disattiva gli altri automaticamente)await projectService.setStatus('uuid-456', 'active');
```
<a name="module_services/projectService.getActiveProjectDir"></a>

### services/projectService.getActiveProjectDir() ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Recupera il percorso della directory del progetto attualmente attivo.

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - Percorso completo o null se nessun progetto attivo  
**Example**  
```js
const dir = await projectService.getActiveProjectDir();if (dir) {  const assets = await fs.readFile(path.join(dir, 'threat-model.json'));}
```
<a name="module_services/projectService.getProjectDir"></a>

### services/projectService.getProjectDir(projectId) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Recupera il percorso della directory di un progetto specifico per ID.Utile per operazioni amministrative o migrazioni.

**Kind**: static method of [<code>services/projectService</code>](#module_services/projectService)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - Percorso completo o null se il progetto non esiste  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>string</code> | ID del progetto |

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
Gestisce la lettura e scrittura del modello dati principale (asset + flussi)con supporto per percorsi dinamici. Permette l'isolamento dei dati per progettoaccettando un `projectDir` opzionale.## Supporto multi-progettoQuando viene passato `projectDir`, il modello opera nella directory isolatadel progetto specifico:```backend/data/<project-uuid>/threat-model.json```Se `projectDir` è `null` o `undefined`, usa la directory di fallback:```backend/data/threat-model.json```## Struttura del modello```json{  "assets": [    { "id": "uuid", "name": "Asset Name", "category": "Process", ... }  ],  "flows": [    { "id": "uuid", "fromId": "asset-id", "toId": "asset-id", "label": "Flow Label" }  ]}```

**See**

- [../services/projectService.js](../services/projectService.js) Servizio che gestisce le directory progetto
- [../middleware/projectScope.js](../middleware/projectScope.js) Middleware che inietta req.projectDir


* [models/assetModel](#module_models/assetModel)
    * [~loadModel([projectDir])](#module_models/assetModel..loadModel) ⇒ <code>Promise.&lt;{assets: Array.&lt;Object&gt;, flows: Array.&lt;Object&gt;}&gt;</code>
    * [~saveModel(model, [projectDir])](#module_models/assetModel..saveModel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_models/assetModel..loadModel"></a>

### models/assetModel~loadModel([projectDir]) ⇒ <code>Promise.&lt;{assets: Array.&lt;Object&gt;, flows: Array.&lt;Object&gt;}&gt;</code>
Carica il modello completo (assets + flows) dalla directory specificata.Se il file non esiste o è corrotto, restituisce una struttura vuota sicura.

**Kind**: inner method of [<code>models/assetModel</code>](#module_models/assetModel)  
**Returns**: <code>Promise.&lt;{assets: Array.&lt;Object&gt;, flows: Array.&lt;Object&gt;}&gt;</code> - Modello dati con asset e flussi  
**Throws**:

- <code>Error</code> Solo in caso di errori di sistema gravi (permessi, disco pieno, ecc.)


| Param | Type | Description |
| --- | --- | --- |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo (da req.projectDir) |

**Example**  
```js
// Carica dal progetto attivoconst model = await loadModel(req.projectDir);// Carica dalla directory di fallbackconst model = await loadModel();console.log(model.assets.length); // → Numero di asset caricati
```
<a name="module_models/assetModel..saveModel"></a>

### models/assetModel~saveModel(model, [projectDir]) ⇒ <code>Promise.&lt;void&gt;</code>
Salva il modello completo (assets + flows) nella directory specificata.Crea la directory se manca e formatta il JSON per leggibilità.

**Kind**: inner method of [<code>models/assetModel</code>](#module_models/assetModel)  
**Throws**:

- <code>Error</code> Se la scrittura fallisce (permessi, disco pieno, ecc.)


| Param | Type | Description |
| --- | --- | --- |
| model | <code>Object</code> | Modello da salvare con proprietà `assets` e `flows` |
| model.assets | <code>Array.&lt;Object&gt;</code> | Lista di asset da salvare |
| model.flows | <code>Array.&lt;Object&gt;</code> | Lista di flussi da salvare |
| [projectDir] | <code>string</code> | Percorso della directory del progetto attivo |

**Example**  
```js
// Salva nel progetto attivoawait saveModel({ assets: [...], flows: [...] }, req.projectDir);// Salva nella directory di fallbackawait saveModel({ assets: [], flows: [] });
```
<a name="module_utils/configUtils"></a>

## utils/configUtils
Utility per la gestione della configurazione

<a name="module_utils/errorHandler"></a>

## utils/errorHandler
Middleware centralizzato per la gestione degli errori


* [utils/errorHandler](#module_utils/errorHandler)
    * [~asyncHandler(fn)](#module_utils/errorHandler..asyncHandler) ⇒ <code>function</code>
    * [~errorMiddleware(err, req, res, next)](#module_utils/errorHandler..errorMiddleware)

<a name="module_utils/errorHandler..asyncHandler"></a>

### utils/errorHandler~asyncHandler(fn) ⇒ <code>function</code>
Wrapper per gestire le eccezioni nelle route asincrone

**Kind**: inner method of [<code>utils/errorHandler</code>](#module_utils/errorHandler)  
**Returns**: <code>function</code> - Middleware che cattura errori e li passa a next()  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | Funzione asincrona da eseguire |

<a name="module_utils/errorHandler..errorMiddleware"></a>

### utils/errorHandler~errorMiddleware(err, req, res, next)
Middleware globale per la gestione degli errori

**Kind**: inner method of [<code>utils/errorHandler</code>](#module_utils/errorHandler)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Error</code> | Oggetto errore |
| req | <code>Object</code> | Request Express |
| res | <code>Object</code> | Response Express |
| next | <code>function</code> | Next middleware |

<a name="module_routes/analysis"></a>

## routes/analysis
Route per le operazioni di analisi (estrazione asset)

<a name="module_routes/assets"></a>

## routes/assets
Gestisce tutte le operazioni CRUD per asset e flussi, più endpoint avanzatiper importazione bulk e suggerimenti AI.## Endpoint gestiti| Metodo | Endpoint | Descrizione ||--------|----------|-------------|| GET | `/api/assets` | Recupera tutti gli asset || POST | `/api/assets` | Crea un nuovo asset || POST | `/api/assets/import` | Importa asset in blocco (LLM extraction) || PUT | `/api/assets/:id` | Aggiorna un asset esistente || DELETE | `/api/assets/:id` | Elimina un asset (cascade delete flussi orfani) || POST | `/api/assets/:id/suggest` | Suggerimenti AI per migliorare un asset || GET | `/api/flows` | Recupera tutti i flussi || POST | `/api/flows` | Crea un nuovo flusso || PUT | `/api/flows/:id` | Aggiorna un flusso esistente || DELETE | `/api/flows/:id` | Elimina un flusso |

**See**

- [../controllers/assetController.js](../controllers/assetController.js) Controller per operazioni asset
- [../controllers/flowController.js](../controllers/flowController.js) Controller per operazioni flussi
- [../controllers/assetSuggestionController.js](../controllers/assetSuggestionController.js) Controller per suggerimenti AI

<a name="module_routes/projects"></a>

## routes/projects
Gestisce tutte le operazioni CRUD per i progetti, inclusa l'attivazione/archiviazione.Le rotte operano su `projects.json` e creano directory isolate per ogni progetto.## Endpoint gestiti| Metodo | Endpoint | Descrizione ||--------|----------|-------------|| GET | `/api/projects` | Recupera lista progetti || POST | `/api/projects` | Crea nuovo progetto (auto-attivato) || PUT | `/api/projects/:id` | Aggiorna metadati progetto || POST | `/api/projects/:id/status` | Cambia stato progetto (draft/active/archived) |

**See**: [../services/projectService.js](../services/projectService.js) Service per logica business  
