// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { z } = require('zod');
//const pdfParse = require('pdf-parse');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;
const csvParser = require('csv-parser');
const axios = require('axios'); // Import aggiunto per le chiamate HTTP interne

// =========================================================
// 1. INIZIALIZZAZIONE EXPRESS
// =========================================================
const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 2. COSTANTI & CONFIGURAZIONE
// =========================================================
const JSON_FILE = path.join(__dirname, 'threat-model.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const VALID_TYPES = ['docs', 'csv', 'context'];

const DEFAULT_CONFIG = {
    ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
        enabled: true
    },
    project: { name: 'Nuovo Progetto' }
};

// =========================================================
// 3. HELPER FUNCTIONS (FILE & CONFIG)
// =========================================================

// Carica o crea il file di configurazione globale
const loadConfig = async () => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        // Se non esiste, crea il default
        await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return DEFAULT_CONFIG;
    }
};

// Salva la configurazione globale
const saveConfig = async (config) => {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
};

// Carica o crea il modello dati (Threat Model)
async function loadModel() {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        const init = {
            project: { name: 'Nuovo Progetto', version: '1.0', owner: '' },
            config: DEFAULT_CONFIG, // Mantenuto per retrocompatibilità se necessario, ma ora usiamo config.json
            assets: []
        };
        await fs.writeFile(JSON_FILE, JSON.stringify(init, null, 2));
        return init;
    }
}

// Estrazione testo da file
async function extractText(filePath, ext) {
    const buffer = fsSync.readFileSync(filePath);
    if (ext === '.pdf') {
        const data = await pdfParse(buffer);
        return data.text || '';
    }
    // Pulizia base per MD, HTML, TXT, TEX
    return buffer.toString('utf8')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function ensureUploadDirs() {
    VALID_TYPES.forEach(t => fsSync.mkdirSync(path.join(UPLOAD_DIR, t), { recursive: true }));
}

// =========================================================
// 4. MULTER (UPLOAD FILE)
// =========================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type || 'docs';
        if (!VALID_TYPES.includes(type)) return cb(new Error('Tipo non valido'));
        const dir = path.join(UPLOAD_DIR, type);
        fsSync.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// =========================================================
// 5. ROUTES: CONFIGURAZIONE GLOBALE
// =========================================================

// Ottieni configurazione corrente
app.get('/api/config', async (req, res) => {
    const config = await loadConfig();
    res.json(config);
});

// Aggiorna configurazione (es. cambio modello)
app.put('/api/config', async (req, res) => {
    try {
        const currentConfig = await loadConfig();
        const newConfig = { ...currentConfig, ...req.body }; // Merge parziale

        if (!newConfig.ollama || !newConfig.ollama.model) {
            return res.status(400).json({ error: 'Modello obbligatorio' });
        }

        await saveConfig(newConfig);
        res.json(newConfig);
    } catch (err) {
        console.error('Errore salvataggio config:', err);
        res.status(500).json({ error: 'Impossibile salvare la configurazione' });
    }
});

// Ottieni lista modelli disponibili da Ollama
app.get('/api/ollama/models', async (req, res) => {
    try {
        const config = await loadConfig();
        const response = await axios.get(`${config.ollama.baseUrl}/api/tags`);

        // Ollama restituisce { models: [ { name: 'llama3', ... }, ... ] }
        const modelNames = response.data.models.map(m => m.name);
        res.json(modelNames);
    } catch (err) {
        console.error('Errore connessione a Ollama:', err.message);
        res.status(503).json({ error: 'Impossibile connettersi a Ollama. Verifica che sia attivo.' });
    }
});

// =========================================================
// 6. ROUTES: ASSETS CRUD
// =========================================================
app.get('/api/assets', async (req, res) => {
    const model = await loadModel();
    res.json(model.assets);
});

app.post('/api/assets', async (req, res) => {
    const model = await loadModel();
    const newAsset = { id: uuidv4(), ...req.body };
    model.assets.push(newAsset);
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
    res.status(201).json(newAsset);
});

app.put('/api/assets/:id', async (req, res) => {
    const model = await loadModel();
    const idx = model.assets.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
    model.assets[idx] = { ...model.assets[idx], ...req.body, id: req.params.id };
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
    res.json(model.assets[idx]);
});

app.delete('/api/assets/:id', async (req, res) => {
    const model = await loadModel();
    const idx = model.assets.findIndex(a => a.id === req.params.id);

    if (idx === -1) {
        return res.status(404).json({ error: 'Asset non trovato' });
    }

    model.assets.splice(idx, 1);
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
    res.json({ message: 'Asset eliminato con successo' });
});

// =========================================================
// 7. ROUTES: GESTIONE FILE
// =========================================================
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    res.json({ success: true, filename: req.file.filename, path: req.file.path, type: req.params.type });
});

app.get('/api/files/:type', (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    const dir = path.join(UPLOAD_DIR, req.params.type);
    if (!fsSync.existsSync(dir)) return res.json([]);
    const files = fsSync.readdirSync(dir).map(f => ({
        name: f,
        path: path.join(dir, f),
        ext: path.extname(f).toLowerCase()
    }));
    res.json(files);
});

app.delete('/api/files/:type/:filename', (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    const filePath = path.join(UPLOAD_DIR, req.params.type, req.params.filename);
    if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
    res.json({ success: true });
});

// =========================================================
// 8. ROUTES: CSV VALIDATION & LLM EXTRACTION
// =========================================================
const assetSchema = z.array(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    subCategory: z.string().nullable().optional(),
    description: z.string().nullable().optional()
}));

app.post('/api/validate-csv', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nessun file CSV caricato' });

    const rows = [];
    fsSync.createReadStream(req.file.path)
        .pipe(csvParser())
        .on('data', row => rows.push(row))
        .on('end', () => {
            const normalized = rows.map(r => ({
                name: r.name || r.Nome || r.asset || r.Asset || '',
                category: r.category || r.Categoria || '',
                subCategory: r.subCategory || r.Sottocategoria || r.Subcategory || null,
                description: r.description || r.Descrizione || r.Note || null
            }));
            const result = assetSchema.safeParse(normalized);
            res.json({
                valid: result.success,
                assets: result.success ? result.data : [],
                errors: result.success ? [] : result.error.flatten(),
                preview: normalized.slice(0, 5),
                count: normalized.length
            });
        })
        .on('error', err => res.status(500).json({ error: err.message }));
});

app.post('/api/analyze/extract-assets', async (req, res) => {
    const { docFiles, contextFiles } = req.body;
    const config = await loadConfig();

    console.log("🔍 INIZIO ANALISI A BLOCCHI");
    console.log(`   📂 Documenti da analizzare: ${docFiles?.length || 0}`);
    console.log(`   📚 File di contesto (fissi): ${contextFiles?.length || 0}`);

    if (!config.ollama.enabled) {
        return res.status(400).json({ error: 'LLM non abilitato.' });
    }

    // 1. COSTRUZIONE DEL CONTESTO FISSO (Non viene mai spezzettato)
    let fixedContextText = "";
    if (contextFiles && contextFiles.length > 0) {
        console.log("   📥 Caricamento file di contesto...");
        for (const fPath of contextFiles) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                fixedContextText += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${text}\n`;
            }
        }
        console.log(`   ✅ Contesto fisso pronto: ${fixedContextText.length} caratteri.`);
    }

    // 2. PREPARAZIONE SYSTEM PROMPT
    // Istruiamo l'LLM a restituire SOLO JSON, sapendo che riceverà solo un pezzo di testo
    const systemPrompt = `Sei un esperto di Threat Modeling STRIDE-AI. 
Analizza il TESTO fornito qui sotto ed estrai gli asset tecnici.
IMPORTANTE: Il testo potrebbe essere solo una parte di un documento più lungo.
Restituisci ESCLUSIVAMENTE un array JSON valido di oggetti: 
[{"name": "string", "category": "string", "subCategory": "string|null", "description": "string"}].
Categorie valide: Data, Models & Algorithms, Infrastructure & Storage, Processes & Workflows, Actors & External Dependencies, AI-Specific Artefacts.
NON includere markdown, spiegazioni o testo fuori dal JSON.
Se nel pezzo di testo non trovi asset rilevanti, restituisci un array vuoto [].

${fixedContextText ? "USA LE SEGUENTI DEFINIZIONI DAL CONTESTO PER CLASSIFICARE CORRETTAMENTE:\n" + fixedContextText.substring(0, 15000) : ""}
`;
    // Nota: Se il contesto fisso è enorme, potresti doverlo truncare anche lui, ma di solito le taxonomy stanno sotto i 15k char.

    // 3. ESTRAZIONE E CHUNKING DEI DOCUMENTI PRINCIPALI
    let mainDocText = "";
    for (const fPath of (docFiles || [])) {
        if (fsSync.existsSync(fPath)) {
            const text = await extractText(fPath, path.extname(fPath));
            mainDocText += `\n--- DOCUMENTO: ${path.basename(fPath)} ---\n${text}\n`;
        }
    }

    if (!mainDocText.trim()) {
        return res.status(400).json({ error: 'Nessun testo estratto dai documenti principali.' });
    }

    // Configurazione Chunking
    const CHUNK_SIZE = 3500; // Caratteri per blocco (sicuro per modelli piccoli come qwen2.5:3b)
    const OVERLAP = 500;     // Sovrapposizione per non tagliare frasi a metà

    const chunks = [];
    for (let i = 0; i < mainDocText.length; i += CHUNK_SIZE - OVERLAP) {
        let chunk = mainDocText.substring(i, i + CHUNK_SIZE);
        // Se non siamo alla fine, tagliamo all'ultimo spazio o punto per non spezzare parole
        if (i + CHUNK_SIZE < mainDocText.length) {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > CHUNK_SIZE * 0.8) { // Solo se lo spazio è ragionevolmente vicino alla fine
                chunk = chunk.substring(0, lastSpace);
            }
        }
        chunks.push(chunk);
    }

    console.log(`   📝 Documento principale suddiviso in ${chunks.length} blocchi da analizzare sequenzialmente.`);

    const allExtractedAssets = [];

    // 4. CICLO DI ANALISI
    for (let i = 0; i < chunks.length; i++) {
        const currentChunk = chunks[i];
        console.log(`   🔄 Analisi blocco ${i + 1}/${chunks.length}...`);

        try {
            const userPrompt = `Analizza questo estratto di testo ed estrai gli asset:\n\n${currentChunk}`;

            const response = await axios.post(`${config.ollama.baseUrl}/api/chat`, {
                model: config.ollama.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                format: { type: 'object' },
                stream: false,
                options: { temperature: 0.1 } // Bassa temperatura per consistenza
            });

            let raw = response.data.message?.content || response.data.response || '';
            raw = raw.replace(/```json\s*|\s*```/g, '').trim();

            if (!raw.startsWith('[') && !raw.startsWith('{')) {
                console.warn(`   ⚠️ Blocco ${i + 1}: Risposta non JSON valida, saltato.`);
                continue;
            }

            // Parsing sicuro
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                console.warn(`   ⚠️ Blocco ${i + 1}: Errore parsing JSON, saltato.`);
                continue;
            }

            // Normalizzazione in array
            let blockAssets = [];
            if (Array.isArray(parsed)) blockAssets = parsed;
            else if (parsed.data && Array.isArray(parsed.data)) blockAssets = parsed.data;
            else if (parsed.assets && Array.isArray(parsed.assets)) blockAssets = parsed.assets;
            else if (parsed.name) blockAssets = [parsed];

            // Pulizia e aggiunta
            blockAssets.forEach(asset => {
                if (asset.name && asset.category) {
                    // Normalizza nome per evitare duplicati semplici (trim, lowercase check)
                    asset.name = String(asset.name).trim();
                    asset.category = String(asset.category).trim();
                    allExtractedAssets.push(asset);
                }
            });

        } catch (err) {
            console.error(`   ❌ Errore nel blocco ${i + 1}:`, err.message);
            // Continua con il prossimo blocco invece di fallire tutto
        }
    }

    // 5. DEDUPLICAZIONE FINALE
    // Rimuove duplicati basati sul nome (case-insensitive)
    const uniqueAssetsMap = new Map();
    allExtractedAssets.forEach(asset => {
        const key = asset.name.toLowerCase();
        if (!uniqueAssetsMap.has(key)) {
            uniqueAssetsMap.set(key, asset);
        }
    });

    const finalAssets = Array.from(uniqueAssetsMap.values());

    console.log(`   ✅ Analisi completata. Trovati ${allExtractedAssets.length} grezzi, ${finalAssets.length} unici dopo deduplica.`);

    res.json({
        assets: finalAssets,
        count: finalAssets.length,
        rawCount: allExtractedAssets.length,
        chunksProcessed: chunks.length
    });
});

app.post('/api/assets/import', async (req, res) => {
    const { assets } = req.body;
    if (!Array.isArray(assets)) return res.status(400).json({ error: 'Formato non valido' });
    const model = await loadModel();
    const newAssets = assets.map(a => ({ id: uuidv4(), ...a }));
    model.assets = [...model.assets, ...newAssets];
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
    res.json({ success: true, imported: newAssets.length });
});

// =========================================================
// 9. ROUTES: TEST CONNESSIONI
// =========================================================
app.post('/api/test/ollama', async (req, res) => {
    const { host, port } = req.body;
    const baseUrl = `${host}:${port}`;
    try {
        const response = await axios.get(`${baseUrl}/api/version`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ connected: true, message: `✅ Connesso a Ollama v${response.data.version}` });
        }
    } catch {
        // Timeout o errore
    }
    res.json({ connected: false, message: '❌ Ollama non raggiungibile.' });
});

app.post('/api/test/db', async (req, res) => {
    const { type, path: dbPath } = req.body;
    try {
        if (type === 'sqlite') {
            const fullPath = path.resolve(dbPath);
            const dir = path.dirname(fullPath);
            fsSync.accessSync(dir, fsSync.constants.W_OK);
            return res.json({ connected: true, message: `✅ Percorso DB accessibile: ${fullPath}` });
        }
        res.json({ connected: false, message: '❌ Tipo DB non supportato.' });
    } catch (err) {
        res.json({ connected: false, message: `❌ Errore accesso: ${err.message}` });
    }
});

// =========================================================
// 10. AVVIO SERVER
// =========================================================
const PORT = 3001;
ensureUploadDirs();
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));