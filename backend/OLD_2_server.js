// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { z } = require('zod');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;
const csvParser = require('csv-parser');
const axios = require('axios');

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
const TAXONOMY_PATH = path.join(__dirname, './context/taxonomy.json');

let FULL_TAXONOMY = null; // verrà caricato all'avvio

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

const loadConfig = async () => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return DEFAULT_CONFIG;
    }
};

const saveConfig = async (config) => {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
};

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
    return buffer.toString('utf8')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function ensureUploadDirs() {
    VALID_TYPES.forEach(t => fsSync.mkdirSync(path.join(UPLOAD_DIR, t), { recursive: true }));
}

// ================== HELPERS PER TASSONOMIA ==================
function getCategoryNames() {
    return FULL_TAXONOMY.categories.map(c => c.name);
}

function getSubcategoryNames(categoryName) {
    const cat = FULL_TAXONOMY.categories.find(c => c.name === categoryName);
    return cat ? cat.subcategories.map(sc => sc.name) : [];
}

function getSubcategoryDescription(categoryName, subcategoryName) {
    const cat = FULL_TAXONOMY.categories.find(c => c.name === categoryName);
    if (!cat) return '';
    const sub = cat.subcategories.find(sc => sc.name === subcategoryName);
    return sub ? sub.description : '';
}

function getCategoryDescription(categoryName) {
    const cat = FULL_TAXONOMY.categories.find(c => c.name === categoryName);
    return cat ? cat.description : '';
}

// Inferisci categoria dal nome (fallback)
function inferCategoryFromName(name) {
    const lower = name.toLowerCase();
    if (lower.includes('model') || lower.includes('algoritmo') || lower.includes('rete neurale') || lower.includes('llm') || lower.includes('transformer')) return 'Models';
    if (lower.includes('database') || lower.includes('data') || lower.includes('dataset') || lower.includes('archivio') || lower.includes('rag') || lower.includes('corpus')) return 'Data';
    if (lower.includes('server') || lower.includes('api') || lower.includes('endpoint') || lower.includes('storage') || lower.includes('cloud') || lower.includes('chroma') || lower.includes('vector')) return 'Infrastructure';
    if (lower.includes('user') || lower.includes('attore') || lower.includes('admin') || lower.includes('sviluppatore') || lower.includes('doctor') || lower.includes('patient')) return 'Actors';
    if (lower.includes('processo') || lower.includes('workflow') || lower.includes('pipeline') || lower.includes('training') || lower.includes('retraining') || lower.includes('loop') || lower.includes('adaptation')) return 'Processes';
    if (lower.includes('tool') || lower.includes('framework') || lower.includes('libreria')) return 'Tools';
    if (lower.includes('documento') || lower.includes('schema') || lower.includes('architettura') || lower.includes('prompt') || lower.includes('version')) return 'Artefacts';
    return 'Data';
}

// Estrazione JSON anche da risposte malformate
function extractFirstJSON(text) {
    let match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (match) return match[0];
    match = text.match(/\{[\s\S]*?\}/);
    if (match) return match[0];
    return null;
}

// =========================================================
// 4. MULTER
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
// 5. ROUTES: CONFIGURAZIONE
// =========================================================
app.get('/api/config', async (req, res) => {
    const config = await loadConfig();
    res.json(config);
});

app.put('/api/config', async (req, res) => {
    try {
        const currentConfig = await loadConfig();
        const newConfig = { ...currentConfig, ...req.body };
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

app.get('/api/ollama/models', async (req, res) => {
    try {
        const config = await loadConfig();
        const response = await axios.get(`${config.ollama.baseUrl}/api/tags`);
        const modelNames = response.data.models.map(m => m.name);
        res.json(modelNames);
    } catch (err) {
        console.error('Errore connessione a Ollama:', err.message);
        res.status(503).json({ error: 'Impossibile connettersi a Ollama.' });
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
    if (idx === -1) return res.status(404).json({ error: 'Asset non trovato' });
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
// 8. ROUTES: CSV VALIDATION
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

// =========================================================
// 9. ROUTE: ESTRAZIONE ASSET IN 4 FASI (con tassonomia e contesto solo in fase 3)
// =========================================================
app.post('/api/analyze/extract-assets', async (req, res) => {
    const { docFiles, contextFiles } = req.body;
    const config = await loadConfig();

    console.log("\n🔍 AVVIO ANALISI IN 4 FASI");
    console.log(`   📂 Documenti da analizzare: ${docFiles?.length || 0}`);
    console.log(`   📚 File di contesto (fissi): ${contextFiles?.length || 0}`);

    if (!config.ollama.enabled) {
        console.error("❌ LLM non abilitato nella configurazione.");
        return res.status(400).json({ error: 'LLM non abilitato.' });
    }

    // ----- Caricamento file di contesto (verranno usati SOLO in fase 3) -----
    let fixedContextRich = "";
    if (contextFiles && contextFiles.length > 0) {
        console.log("   📥 Caricamento file di contesto (per fase 3)...");
        for (const fPath of contextFiles) {
            if (fsSync.existsSync(fPath)) {
                const text = await extractText(fPath, path.extname(fPath));
                const truncated = text.length > 3000 ? text.substring(0, 3000) + "…" : text;
                fixedContextRich += `\n--- CONTESTO: ${path.basename(fPath)} ---\n${truncated}\n`;
            }
        }
        console.log(`   ✅ Contesto caricato: ${fixedContextRich.length} caratteri.`);
    }

    // ----- Estrazione testo dai documenti principali -----
    let mainDocText = "";
    for (const fPath of (docFiles || [])) {
        if (fsSync.existsSync(fPath)) {
            const text = await extractText(fPath, path.extname(fPath));
            mainDocText += `\n--- DOCUMENTO: ${path.basename(fPath)} ---\n${text}\n`;
        }
    }

    if (!mainDocText.trim()) {
        console.error("❌ Nessun testo estratto dai documenti principali.");
        return res.status(400).json({ error: 'Nessun testo estratto dai documenti principali.' });
    }
    console.log(`   📄 Testo totale documenti: ${mainDocText.length} caratteri.`);

    // ----- Chunking (2000 caratteri, overlap 300) -----
    const CHUNK_SIZE = 2000;
    const OVERLAP = 300;
    const chunks = [];
    for (let i = 0; i < mainDocText.length; i += CHUNK_SIZE - OVERLAP) {
        let chunk = mainDocText.substring(i, i + CHUNK_SIZE);
        if (i + CHUNK_SIZE < mainDocText.length) {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace > CHUNK_SIZE * 0.7) {
                chunk = chunk.substring(0, lastSpace);
            }
        }
        chunks.push(chunk);
    }
    console.log(`   ✂️ Documento suddiviso in ${chunks.length} chunk.`);

    // =========================================================
    // FASE 1: Estrazione grezza (solo nome asset + chunk ID)
    // =========================================================
    console.log("\n📍 FASE 1: Estrazione asset grezzi (nome + chunk ID)");
    const rawAssetOccurrences = [];
    const categoriesList = getCategoryNames().join(', ');
    const systemPromptPhase1 = `Sei un estrattore di asset tecnici.
Leggi il testo e restituisci SOLO un array JSON di oggetti con un campo "name".
Categorie accettate: ${categoriesList}
Includi nomi di modelli, dataset, database, API, servizi, percorsi di file (es. "data/images/").
Esempio: [{"name": "EfficientNet-B4"}, {"name": "data/images/"}, {"name": "ChromaDB"}]
Se non trovi asset, restituisci [].`;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   🔎 Analisi chunk ${i + 1}/${chunks.length}...`);

        try {
            // Nella FASE 1 NON usiamo i file di contesto per non allungare il prompt
            const userPrompt = `Testo da analizzare:\n${chunk}`;

            const response = await axios.post(`${config.ollama.baseUrl}/api/chat`, {
                model: config.ollama.model,
                messages: [
                    { role: 'system', content: systemPromptPhase1 },
                    { role: 'user', content: userPrompt }
                ],
                stream: false,
                options: { temperature: 0.1, num_predict: 256 }
            });

            let raw = response.data.message?.content || response.data.response || '';
            raw = raw.replace(/```json\s*|\s*```/g, '').trim();
            let jsonString = extractFirstJSON(raw);
            if (!jsonString) {
                console.warn(`      ⚠️ Nessun JSON trovato, salto chunk.`);
                continue;
            }

            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            } catch (e) {
                console.warn(`      ⚠️ JSON non valido, salto chunk.`);
                continue;
            }

            let assetsInChunk = [];
            if (Array.isArray(parsed)) assetsInChunk = parsed;
            else if (parsed.name) assetsInChunk = [parsed];

            for (const a of assetsInChunk) {
                if (a.name && typeof a.name === 'string' && a.name.trim().length > 0) {
                    rawAssetOccurrences.push({
                        name: a.name.trim(),
                        chunkIndex: i
                    });
                }
            }
            console.log(`      → Trovati ${assetsInChunk.length} asset grezzi.`);
        } catch (err) {
            console.error(`      ❌ Errore nel chunk ${i + 1}:`, err.message);
        }
    }
    console.log(`   📊 Asset grezzi totali rilevati: ${rawAssetOccurrences.length}`);
    if (rawAssetOccurrences.length === 0) {
        console.log("🏁 Nessun asset trovato.");
        return res.json({ assets: [], count: 0, chunksProcessed: chunks.length });
    }

    // =========================================================
    // FASE 2: Cross-check e deduplica (backend)
    // =========================================================
    console.log("\n📍 FASE 2: Cross-check e deduplica asset");
    const assetGroups = new Map();
    for (const occ of rawAssetOccurrences) {
        const key = occ.name.toLowerCase();
        if (!assetGroups.has(key)) {
            assetGroups.set(key, { name: occ.name, chunkIndices: new Set() });
        }
        assetGroups.get(key).chunkIndices.add(occ.chunkIndex);
    }
    const uniqueAssets = Array.from(assetGroups.values()).map(group => ({
        name: group.name,
        chunkIndices: Array.from(group.chunkIndices).sort((a, b) => a - b),
        primaryChunkIndex: group.chunkIndices.values().next().value
    }));
    console.log(`   ✅ Asset unici: ${uniqueAssets.length}`);
    for (const asset of uniqueAssets) {
        console.log(`      - "${asset.name}" (chunk: ${asset.chunkIndices.join(', ')})`);
    }

    // =========================================================
    // FASE 3: Arricchimento tassonomico con contesto opzionale (solo se presente)
    // =========================================================
    console.log("\n📍 FASE 3: Arricchimento con tassonomia");
    const enrichedAssets = [];

    for (const asset of uniqueAssets) {
        const primaryChunk = chunks[asset.primaryChunkIndex];
        console.log(`   🏷️  Elaborazione: "${asset.name}"`);

        // Prepara descrizioni delle categorie (utili per il prompt)
        const categoriesWithDesc = FULL_TAXONOMY.categories.map(c => `${c.name}: ${c.description}`).join('\n');
        const systemPromptPhase3 = `Sei un classificatore di asset per threat modeling.
Categorie disponibili (con descrizione):
${categoriesWithDesc}

Per ogni categoria esistono sottocategorie predefinite. Non inventare nuove sottocategorie.
Rispondi SOLO con un JSON valido in questo formato:
{"category": "stringa (nome categoria)", "subCategory": "stringa (sottocategoria valida)", "description": "descrizione oggettiva"}

REGOLE:
- Descrizione OGGETTIVA (cosa è, a cosa serve), senza minacce.
- Scegli la sottocategoria più appropriata tra quelle della categoria scelta.`;

        let userPrompt = `Testo originale da cui è stato estratto l'asset:
"""
${primaryChunk}
"""

Nome asset: "${asset.name}"

Classifica questo asset: scegli CATEGORIA (tra quelle elencate), SOTTOCATEGORIA (valida per quella categoria) e scrivi una descrizione OGGETTIVA.`;

        // Aggiungi il contesto caricato dall'utente SOLO se presente
        if (fixedContextRich) {
            userPrompt = `Contesto aggiuntivo (fornito dall'utente):\n${fixedContextRich}\n\n` + userPrompt;
        }

        try {
            const response = await axios.post(`${config.ollama.baseUrl}/api/chat`, {
                model: config.ollama.model,
                messages: [
                    { role: 'system', content: systemPromptPhase3 },
                    { role: 'user', content: userPrompt }
                ],
                stream: false,
                options: { temperature: 0.2, num_predict: 512 }
            });

            let raw = response.data.message?.content || '';
            raw = raw.replace(/```json\s*|\s*```/g, '').trim();
            let jsonString = extractFirstJSON(raw);
            if (!jsonString) throw new Error('Nessun JSON valido');
            let parsed = JSON.parse(jsonString);

            // Validazione categoria
            let category = getCategoryNames().find(c => c.toLowerCase() === parsed.category?.toLowerCase());
            if (!category) {
                console.warn(`      ⚠️ Categoria non valida "${parsed.category}", inferisco...`);
                category = inferCategoryFromName(asset.name);
            }

            // Validazione sottocategoria
            const validSubcats = getSubcategoryNames(category);
            let subCategory = "";
            if (parsed.subCategory && validSubcats.includes(parsed.subCategory)) {
                subCategory = parsed.subCategory;
            } else if (parsed.subCategory) {
                const found = validSubcats.find(sc => sc.toLowerCase() === parsed.subCategory.toLowerCase());
                if (found) subCategory = found;
                else if (validSubcats.length > 0) subCategory = validSubcats[0];
                if (subCategory) console.warn(`      ⚠️ Sottocategoria corretta a "${subCategory}"`);
            } else if (validSubcats.length > 0) {
                subCategory = validSubcats[0];
            }

            // Filtra descrizione (rimuovi parole di attacco)
            let description = parsed.description || `Asset: ${asset.name}`;
            const attackKeywords = ['attacco', 'minaccia', 'spoofing', 'tampering', 'repudiation', 'information disclosure', 'denial of service', 'elevation of privilege', 'sql injection', 'xss', 'attaccante', 'vulnerabile', 'exploit'];
            if (attackKeywords.some(kw => description.toLowerCase().includes(kw))) {
                console.warn(`      ⚠️ Descrizione contiene attacchi, uso generica.`);
                description = `Asset: ${asset.name} (categoria ${category}).`;
            }

            enrichedAssets.push({
                name: asset.name,
                category,
                subCategory,
                description,
                contextChunk: primaryChunk.substring(0, 1500)
            });
            console.log(`      ✅ → ${category} / ${subCategory || 'generica'}`);
        } catch (err) {
            console.error(`      ❌ Errore per "${asset.name}":`, err.message);
            const fallbackCat = inferCategoryFromName(asset.name);
            enrichedAssets.push({
                name: asset.name,
                category: fallbackCat,
                subCategory: getSubcategoryNames(fallbackCat)[0] || "",
                description: `Asset: ${asset.name}`,
                contextChunk: primaryChunk.substring(0, 1500)
            });
        }
    }

    // =========================================================
    // FASE 4: Revisione consolidata
    // =========================================================
    console.log("\n📍 FASE 4: Revisione consolidata");
    const finalMap = new Map();
    for (const asset of enrichedAssets) {
        const key = asset.name.toLowerCase();
        if (!finalMap.has(key)) {
            finalMap.set(key, asset);
        } else {
            const existing = finalMap.get(key);
            if (asset.description && asset.description.length > (existing.description || '').length) {
                finalMap.set(key, asset);
            }
        }
    }
    let finalAssets = Array.from(finalMap.values());
    finalAssets = finalAssets.filter(a => a.name && a.name.length > 2 && a.name !== "Asset");

    console.log(`   ✅ Asset finali: ${finalAssets.length} (da ${enrichedAssets.length} arricchiti)`);
    console.log("🏁 ANALISI IN 4 FASI COMPLETATA.\n");

    res.json({
        assets: finalAssets,
        count: finalAssets.length,
        chunksProcessed: chunks.length,
        rawOccurrences: rawAssetOccurrences.length,
        uniqueDetected: uniqueAssets.length
    });
});

// =========================================================
// 10. ROUTE: IMPORT ASSET
// =========================================================
app.post('/api/assets/import', async (req, res) => {
    const { assets } = req.body;
    if (!Array.isArray(assets)) return res.status(400).json({ error: 'Formato non valido' });
    const model = await loadModel();
    const newAssets = assets.map(a => ({
        id: uuidv4(),
        name: a.name,
        category: a.category,
        subCategory: a.subCategory,
        description: a.description,
        contextChunk: a.contextChunk || null
    }));
    model.assets = [...model.assets, ...newAssets];
    await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
    res.json({ success: true, imported: newAssets.length });
});

// =========================================================
// 11. ROUTE: MIGLIORAMENTO ASSET (usa tassonomia e contesto salvato)
// =========================================================
app.post('/api/assets/:id/enhance', async (req, res) => {
    const startTime = Date.now();
    console.log(`\n✨ AVVIO MIGLIORAMENTO ASSET [${new Date().toISOString()}]`);

    try {
        const assetId = req.params.id;
        const model = await loadModel();
        const asset = model.assets.find(a => a.id === assetId);
        if (!asset) return res.status(404).json({ error: 'Asset non trovato' });
        console.log(`   📦 Asset: "${asset.name}" (categoria: ${asset.category})`);

        const config = await loadConfig();
        if (!config.ollama.enabled) return res.status(400).json({ error: 'LLM non abilitato' });

        // Prepara descrizioni delle sottocategorie per la categoria corrente
        const categoryObj = FULL_TAXONOMY.categories.find(c => c.name === asset.category);
        const validSubcats = categoryObj ? categoryObj.subcategories : [];
        if (!categoryObj || validSubcats.length === 0) {
            return res.status(400).json({ error: `Nessuna sottocategoria per ${asset.category}` });
        }
        const subcatDescriptions = validSubcats.map(sc => `- ${sc.name}: ${sc.description}`).join('\n');

        const originalContext = asset.contextChunk || '';
        const systemPrompt = `Sei un assistente tecnico. Migliora la scheda di un asset basandoti sul testo originale.
Categorie disponibili (con descrizione breve):
${FULL_TAXONOMY.categories.map(c => `${c.name}: ${c.description}`).join('\n')}

Rispondi SOLO con JSON: {"category": "nuova categoria (se necessario)", "subCategory": "sottocategoria valida", "description": "descrizione oggettiva"}`;

        const userPrompt = `Asset attuale:
- Nome: ${asset.name}
- Categoria: ${asset.category}
- Sottocategoria: ${asset.subCategory || '(nessuna)'}
- Descrizione: ${asset.description || '(nessuna)'}

Testo originale (se disponibile):
"""
${originalContext || 'Nessun contesto disponibile'}
"""

Sottocategorie valide per la categoria "${asset.category}" (con descrizioni):
${subcatDescriptions}

Se la categoria attuale non è appropriata, scegline una più adatta tra quelle disponibili.
Genera JSON con i campi migliorati.`;

        const response = await axios.post(`${config.ollama.baseUrl}/api/chat`, {
            model: config.ollama.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: { temperature: 0.2, num_predict: 512 }
        });

        let raw = response.data.message?.content || '';
        raw = raw.replace(/```json\s*|\s*```/g, '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('JSON non trovato');
        const parsed = JSON.parse(jsonMatch[0]);

        let updated = false;

        // Gestione categoria
        let newCategory = null;
        if (parsed.category && getCategoryNames().includes(parsed.category)) {
            newCategory = parsed.category;
        } else if (parsed.category) {
            const found = getCategoryNames().find(c => c.toLowerCase() === parsed.category.toLowerCase());
            if (found) newCategory = found;
        }
        if (newCategory && newCategory !== asset.category) {
            asset.category = newCategory;
            updated = true;
            console.log(`   ✅ Categoria aggiornata: "${newCategory}"`);
            // Aggiorniamo l'oggetto categoria per la sottocategoria
            const newCatObj = FULL_TAXONOMY.categories.find(c => c.name === newCategory);
            if (newCatObj && newCatObj.subcategories.length > 0 && !asset.subCategory) {
                asset.subCategory = newCatObj.subcategories[0].name;
                updated = true;
            }
        }

        // Gestione sottocategoria (usando la categoria finale)
        const finalCategory = asset.category;
        const finalCatObj = FULL_TAXONOMY.categories.find(c => c.name === finalCategory);
        const finalValidSubcats = finalCatObj ? finalCatObj.subcategories.map(sc => sc.name) : [];
        let newSubCat = null;
        if (parsed.subCategory && finalValidSubcats.includes(parsed.subCategory)) {
            newSubCat = parsed.subCategory;
        } else if (parsed.subCategory) {
            const found = finalValidSubcats.find(sc => sc.toLowerCase() === parsed.subCategory.toLowerCase());
            if (found) newSubCat = found;
            else if (finalValidSubcats.length > 0) newSubCat = finalValidSubcats[0];
        }
        if (newSubCat && newSubCat !== asset.subCategory) {
            asset.subCategory = newSubCat;
            updated = true;
            console.log(`   ✅ Sottocategoria aggiornata: "${newSubCat}"`);
        }

        // Gestione descrizione (filtra attacchi)
        let newDesc = null;
        if (parsed.description && parsed.description.length > 10) {
            const attackKeywords = ['attacco', 'minaccia', 'spoofing', 'tampering', 'repudiation', 'information disclosure', 'denial of service', 'elevation of privilege', 'sql injection', 'xss', 'attaccante', 'vulnerabile', 'exploit'];
            if (!attackKeywords.some(kw => parsed.description.toLowerCase().includes(kw))) {
                newDesc = parsed.description;
                console.log(`   ✅ Descrizione valida (senza attacchi)`);
            } else {
                console.warn(`   ⚠️ Descrizione contiene attacchi, scartata.`);
            }
        }
        if (newDesc && newDesc !== asset.description) {
            asset.description = newDesc;
            updated = true;
        }

        if (!updated) {
            return res.json({ success: false, message: 'Nessuna modifica applicabile' });
        }

        await fs.writeFile(JSON_FILE, JSON.stringify(model, null, 2));
        console.log(`   💾 Asset salvato. Durata: ${Date.now() - startTime} ms`);
        res.json({ success: true, asset });

    } catch (err) {
        console.error(`   ❌ Errore:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// =========================================================
// 12. ROUTE: TASSONOMIA (restituisce l'intero oggetto)
// =========================================================
app.get('/api/taxonomy', async (req, res) => {
    try {
        if (FULL_TAXONOMY) {
            res.json(FULL_TAXONOMY);
        } else {
            const taxonomyRaw = await fs.readFile(TAXONOMY_PATH, 'utf-8');
            const taxonomy = JSON.parse(taxonomyRaw);
            res.json(taxonomy);
        }
    } catch (err) {
        console.error('Errore nel caricamento della tassonomia:', err);
        res.status(500).json({ error: 'Tassonomia non disponibile' });
    }
});

// =========================================================
// 13. ROUTES: TEST CONNESSIONI
// =========================================================
app.post('/api/test/ollama', async (req, res) => {
    const { host, port } = req.body;
    const baseUrl = `${host}:${port}`;
    try {
        const response = await axios.get(`${baseUrl}/api/version`, { timeout: 5000 });
        if (response.status === 200) {
            return res.json({ connected: true, message: `✅ Connesso a Ollama v${response.data.version}` });
        }
    } catch { }
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
// 14. AVVIO SERVER
// =========================================================
const PORT = 3001;
ensureUploadDirs();

// Caricamento tassonomia completa all'avvio
try {
    const taxonomyRaw = fsSync.readFileSync(TAXONOMY_PATH, 'utf-8');
    FULL_TAXONOMY = JSON.parse(taxonomyRaw);
    console.log(`✅ Tassonomia completa caricata (${FULL_TAXONOMY.categories.length} categorie, ${FULL_TAXONOMY.categories.reduce((acc, c) => acc + c.subcategories.length, 0)} sottocategorie)`);
} catch (err) {
    console.error('❌ ERRORE: Impossibile caricare taxonomy.json. Assicurati che il file esista e sia in formato valido.');
    process.exit(1);
}

app.listen(PORT, () => console.log(`✅ Backend attivo su http://localhost:${PORT}`));