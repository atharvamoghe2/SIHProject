const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

function generateKey(prefix, filename) {
    const safe = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const hash = crypto.randomBytes(8).toString('hex');
    return path.posix.join(prefix || 'files', `${Date.now()}-${hash}-${safe}`);
}

async function saveBuffer({ buffer, contentType, keyPrefix = 'students' }) {
    const key = generateKey(keyPrefix, `${crypto.randomBytes(2).toString('hex')}.bin`);
    const fullPath = path.join(uploadDir, key);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, buffer);
    return { key, contentType };
}

async function deleteObject({ fileKey }) {
    const fullPath = path.join(uploadDir, fileKey);
    try { await fs.promises.unlink(fullPath); } catch (_) {}
}

function getDownloadUrl({ fileKey }) {
    // Served by fileRoutes at /api/files/:key*
    // Encode slashes in key for URL safety
    const encodedKey = encodeURIComponent(fileKey);
    return `/api/files/${encodedKey}`;
}

module.exports = { uploadDir, saveBuffer, deleteObject, getDownloadUrl, generateKey };

