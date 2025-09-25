const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/approvalController');

// Placeholder auth + RBAC (faculty/admin). Replace with real middlewares.
function auth(req, _res, next) { req.user = req.user || { id: '000000000000000000000001', role: 'faculty' }; next(); }
function requireFacultyOrAdmin(req, res, next) {
    const role = req.user?.role;
    if (role === 'faculty' || role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden' });
}

router.get('/api/approvals/pending', auth, requireFacultyOrAdmin, ctrl.getPending);
router.post('/api/approvals/:activityId/approve', auth, requireFacultyOrAdmin, express.json(), ctrl.approve);
router.post('/api/approvals/:activityId/reject', auth, requireFacultyOrAdmin, express.json(), ctrl.reject);
router.post('/api/approvals/:activityId/request-changes', auth, requireFacultyOrAdmin, express.json(), ctrl.requestChanges);

module.exports = router;

