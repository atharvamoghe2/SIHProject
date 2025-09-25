const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const multer = require('multer');
const upload = multer();

const ctrl = require('../controllers/studentController');

router.get('/api/students/:id/profile', auth, ctrl.getProfile);
router.get('/api/students/:id/activities', auth, ctrl.getActivities);
// Support both JSON (legacy presign) and multipart (Render/local upload)
router.post('/api/students/:id/activities', auth, upload.single('file'), express.json(), ctrl.postActivity);
router.post('/api/students/:id/portfolio', auth, express.json(), ctrl.postPortfolio);

module.exports = router;

