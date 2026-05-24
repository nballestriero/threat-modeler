// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { z } = require('zod');
const pdfParse = require('pdf-parse');
const csvParser = require('csv-parser');

// =========================================================
// 1. INIZIALIZZAZIONE EXPRESS
// =========================================================
const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 2. COSTANTI & CONFIGURAZIONE DEFAULT
// =========================================================
const JSON_FILE = path.join(__dirname, 'threat-model.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const VALID_TYPES = ['docs', 'csv', 'context'];

const DEFAULT_CONFIG = {
  ollama: { enabled: false, host: 'http://localhost', port: 11434, apiKey: '' },
  database: { enabled: false, type: 'sqlite', path: './data.db' },
  jsonStoragePath: './threat-models/'
};

// =========================================================
// 3. MULTER (UPLOAD FILE)
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
    // Sanificazione nome file per Windows
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // Max 50MB

// =========================================================
// 4. HELPER FUNCTIONS
// =========================================================
async function loadModel() {
  try {
    const data = await fs.readFile(JSON_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    const init = {
      project: { name: 'Nuovo Progetto', version: '1.0', owner: '' },
      config: DEFAULT_CONFIG,
      assets: []
    };
    await fs.writeFile(JSON_FILE, JSON.stringify(init, null, 2));
    return init;
  }
}

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
// 5. ROUTES: CONFIGURAZIONE
// =========================================================
app.get('/api/config', async (req, res) => {
  const model = await loadModel();
  res.json(model.config);
});

app.post('/api/config', async (req, res) => {
  const model = await loadModel();
  model.config = { ...DEFAULT_CONFIG, ...req.body };
  await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
  res.json({ success: true });
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
  const config = (await loadModel()).config;
  if (!config.ollama.enabled) return res.json({ error: 'LLM non abilitato nel pannello Configurazione.' });

  let textContent = '';
  const allFiles = [...(docFiles || []), ...(contextFiles || [])];
  for (const fPath of allFiles) {
    if (fsSync.existsSync(fPath)) {
      const text = await extractText(fPath, path.extname(fPath));
      textContent += `\n--- FILE: ${path.basename(fPath)} ---\n${text}\n`;
    }
  }

  if (!textContent.trim()) return res.json({ error: 'Nessun testo estratto dai file selezionati.' });

  const systemPrompt = `Sei un esperto di Threat Modeling STRIDE-AI. Estrai gli asset tecnici e di processo dal testo fornito. Restituisci SOLO un array JSON valido con oggetti: {"name": string, "category": string, "subCategory": string|null, "description": string}. Categorie valide: Data, Models & Algorithms, Infrastructure & Storage, Processes & Workflows, Actors & External Dependencies, AI-Specific Artefacts. Non aggiungere markdown, commenti o spiegazioni.`;

  try {
    const response = await fetch(`${config.ollama.host}:${config.ollama.port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Testo da analizzare:\n${textContent}` }
        ],
        format: { type: 'object' }, // Ollama JSON mode
        stream: false
      })
    });
    const data = await response.json();
    
    let raw = data.message?.content || data.response || '';
    raw = raw.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(raw);
    const assets = Array.isArray(parsed) ? parsed : parsed.assets || [];
    
    const validation = assetSchema.safeParse(assets);
    res.json(validation.success ? { assets: validation.data, count: validation.data.length } : { error: 'Output LLM non conforme allo schema', details: validation.error.flatten() });
  } catch (err) {
    res.json({ error: 'Errore comunicazione Ollama', message: err.message });
  }
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
// 9. ROUTES: TEST CONNESSIONI REALI
// =========================================================
app.post('/api/test/ollama', async (req, res) => {
  const { host, port } = req.body;
  const baseUrl = `${host}:${port}`;
  try {
    const response = await fetch(`${baseUrl}/api/version`, { 
      method: 'GET', 
      signal: AbortSignal.timeout(5000) 
    });
    if (response.ok) {
      const data = await response.json();
      return res.json({ connected: true, message: `✅ Connesso a Ollama v${data.version}` });
    }
  } catch {
    // Timeout o errore di rete
  }
  res.json({ connected: false, message: '❌ Ollama non raggiungibile. Verifica host/porta e che il servizio sia attivo.' });
});

app.post('/api/test/db', async (req, res) => {
  const { type, path: dbPath } = req.body;
  try {
    if (type === 'sqlite') {
      const fullPath = path.resolve(dbPath);
      const dir = path.dirname(fullPath);
      fsSync.accessSync(dir, fsSync.constants.W_OK);
      return res.json({ connected: true, message: `✅ Percorso DB accessibile e scrivibile: ${fullPath}` });
    }
    res.json({ connected: false, message: '❌ Tipo di DB non ancora supportato in questa versione.' });
  } catch (err) {
    res.json({ connected: false, message: `❌ Errore accesso filesystem/DB: ${err.message}` });
  }
});

// =========================================================
// 10. AVVIO SERVER
// =========================================================
const PORT = 3001;
ensureUploadDirs(); // Crea cartelle upload all'avvio
app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));