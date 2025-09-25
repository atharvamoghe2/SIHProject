const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function auth(req, res, next) {
    const h = req.headers['authorization'] || '';
    const m = h.match(/^Bearer (.+)$/i);
    if (!m) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const payload = jwt.verify(m[1], JWT_SECRET);
        req.user = { id: payload.userId || payload.sub, role: payload.role, studentId: payload.studentId };
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

module.exports = auth;

