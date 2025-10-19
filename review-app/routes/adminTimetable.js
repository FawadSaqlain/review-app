const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const timetableController = require('../controllers/timetableController');
const adminAuth = require('../middleware/adminAuth');

// Manual add form: GET requires admin authentication (redirects to login if not authenticated)

// Manual add form: GET requires admin authentication (redirects to login if not authenticated)
const adminRequire = require('../middleware/adminRequire');
router.get('/class/add', adminRequire, timetableController.renderAddClassForm);
router.post('/class/add', adminAuth, timetableController.addClassManually);

module.exports = router;
