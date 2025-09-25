const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.post('/api/auth/register', express.json(), ctrl.register);
router.post('/api/auth/login', express.json(), ctrl.login);
router.post('/api/auth/refresh', express.json(), ctrl.refresh);

module.exports = router;

