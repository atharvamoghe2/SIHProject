const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');

function auth(req, _res, next) { next(); }
function requireStaff(req, res, next) { return next(); } // replace with real RBAC

router.get('/api/reports/overview', auth, requireStaff, ctrl.getOverview);
router.get('/api/reports/naac', auth, requireStaff, ctrl.getNaac);
router.get('/api/reports/export', auth, requireStaff, ctrl.exportReports);
router.get('/api/reports/student/:id', auth, requireStaff, ctrl.getStudentSummary);

module.exports = router;

