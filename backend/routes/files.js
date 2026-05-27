const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fsSync = require('fs');
const { getUploadDir, VALID_TYPES } = require('../utils/fileUtils');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type || 'docs';
        if (!VALID_TYPES.includes(type)) return cb(new Error('Tipo non valido'));
        const dir = path.join(getUploadDir(), type);
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

router.post('/upload/:type', upload.single('file'), async (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    res.json({ success: true, filename: req.file.filename, path: req.file.path, type: req.params.type });
});

router.get('/files/:type', (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    const dir = path.join(getUploadDir(), req.params.type);
    if (!fsSync.existsSync(dir)) return res.json([]);
    const files = fsSync.readdirSync(dir).map(f => ({
        name: f,
        path: path.join(dir, f),
        ext: path.extname(f).toLowerCase()
    }));
    res.json(files);
});

router.delete('/files/:type/:filename', (req, res) => {
    if (!VALID_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Tipo non valido' });
    const filePath = path.join(getUploadDir(), req.params.type, req.params.filename);
    if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
    res.json({ success: true });
});

module.exports = router;