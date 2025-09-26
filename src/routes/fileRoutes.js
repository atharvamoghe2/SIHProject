const express = require('express');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const router = express.Router();
const { uploadDir } = require('../services/storageService');

// GET /api/files/:key (where key is URL-encoded path with slashes)
// This endpoint serves files - we'll make it public for PDF viewing
router.get('/api/files/:key', async (req, res) => {
    const fileKey = decodeURIComponent(req.params.key);
    const filePath = path.join(uploadDir, fileKey);
    
    // Security check: ensure the file path is within the upload directory
    if (!filePath.startsWith(uploadDir)) {
        return res.status(400).json({ message: 'Invalid file path' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    // Set appropriate headers for PDF viewing
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
    }
    
    return res.sendFile(filePath);
});

// Protected endpoint for file management (if needed)
router.get('/api/files/protected/:key', auth, async (req, res) => {
    const fileKey = decodeURIComponent(req.params.key);
    const filePath = path.join(uploadDir, fileKey);
    if (!filePath.startsWith(uploadDir)) return res.status(400).end();
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    return res.sendFile(filePath);
});

module.exports = router;

