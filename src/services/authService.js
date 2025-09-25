const bycryprtjs = require('bycryprtjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

async function registerStudent({ name, email, roll, department, year, password }) {
    const exists = await User.findOne({ email });
    if (exists) throw new Error('Email already registered');
    const passwordHash = await bycryprtjs.hash(password, 10);
    const student = await Student.create({ name, email, roll, department, year, credentials: {} });
    const user = await User.create({ name, email, roll, department, year, passwordHash, role: 'student', studentId: student._id });
    return sanitizeUser(user);
}

async function validateCredentials({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Invalid credentials');
    const ok = await bycryprtjs.compare(password, user.passwordHash);
    if (!ok) throw new Error('Invalid credentials');
    return sanitizeUser(user);
}

function issueToken(user) {
    const payload = { sub: String(user.id), role: user.role, userId: String(user.id), studentId: user.studentId ? String(user.studentId) : undefined };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return token;
}

function sanitizeUser(user) {
    return { id: String(user._id), name: user.name, email: user.email, role: user.role, studentId: user.studentId ? String(user.studentId) : undefined };
}

module.exports = { registerStudent, validateCredentials, issueToken };

