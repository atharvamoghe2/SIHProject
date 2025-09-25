const authService = require('../services/authService');

async function register(req, res, next) {
    try {
        const { name, email, roll, department, year, password } = req.body || {};
        if (!name || !email || !roll || !department || !year || !password) return res.status(400).json({ message: 'Missing fields' });
        const user = await authService.registerStudent({ name, email, roll, department, year, password });
        return res.status(201).json({ user });
    } catch (e) { next(e); }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
        const user = await authService.validateCredentials({ email, password });
        const token = authService.issueToken(user);
        return res.json({ token, user });
    } catch (e) { next(e); }
}

async function refresh(req, res, next) {
    try {
        // Stub: in production, implement refresh token rotation with DB/Redis
        return res.status(501).json({ message: 'Not implemented. Use short-lived access tokens and refresh rotation.' });
    } catch (e) { next(e); }
}

module.exports = { register, login, refresh };

