const express = require('express');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const router = express.Router();
const { uploadDir } = require('../services/storageService');

// GET /api/files/:key (where key is URL-encoded path with slashes)
router.get('/api/files/:key', auth, async (req, res) => {
    const fileKey = decodeURIComponent(req.params.key);
    const filePath = path.join(uploadDir, fileKey);
    if (!filePath.startsWith(uploadDir)) return res.status(400).end();
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    return res.sendFile(filePath);
});

module.exports = router;

