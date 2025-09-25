const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { getEnv } = require('./config/env');
const { connectToDb } = require('./config/db');
const auth = require('./middlewares/auth');
const authorize = require('./middlewares/authorize');
const errorHandler = require('./middlewares/error.middleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const fileRoutes = require('./routes/fileRoutes');

async function start() {
    const env = getEnv();
    const PORT = env.port || 4000;
    const MONGO_URI = env.mongoUri;

    console.log("🔌 Attempting to connect to MongoDB...");
    console.log("   Using URI:", MONGO_URI);

    try {
        await connectToDb(MONGO_URI);
        console.log("✅ Connected to MongoDB Atlas");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    }

    const app = express();
    app.use(helmet());
    app.use(morgan('dev'));
    app.use(cors({ origin: true, credentials: false }));

    const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
    app.use('/api/auth/', authLimiter);

    // Routes
    app.use(authRoutes);
    app.use(studentRoutes);
    app.use(approvalRoutes);
    app.use(reportRoutes);
    app.use(fileRoutes);

    // Static client
    app.use(express.static(path.join(__dirname, '../../client/public')));
    app.use('/pages', express.static(path.join(__dirname, '../../client/src/pages')));

    app.get('/', (_req, res) => {
        res.sendFile(path.join(__dirname, '../../client/src/pages/dashboard/dashboard.html'));
    });

    // Example protected ping
    app.get('/api/ping-protected',
        auth,
        authorize('student', 'faculty', 'admin'),
        (_req, res) => res.json({ ok: true })
    );

    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}


start().catch(err => {
    console.error('❌ Failed to start app:', err);
    process.exit(1);
});

