const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const adminAuth = require('../middleware/adminAuth');

// Manual add form: GET requires admin authentication (redirects to login if not authenticated)

// Manual add form: GET requires admin authentication (redirects to login if not authenticated)
const adminRequire = require('../middleware/adminRequire');
router.get('/class/add', adminRequire, timetableController.renderAddClassForm);
router.post('/class/add', adminAuth, timetableController.addClassManually);
// Batch upload (XLSX) to add classes in bulk — uses express-fileupload middleware (app.js)
router.post('/class/upload', adminAuth, timetableController.addClassesFromXlsx);

module.exports = router;
