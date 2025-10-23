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

// Term management (admin)
router.get('/terms', adminRequire, timetableController.listTerms);
router.post('/terms', adminAuth, timetableController.createTerm);
router.post('/terms/:id/activate', adminAuth, timetableController.activateTerm);
// Promote a term to active and create the following next term (optional start/end dates)
router.post('/terms/:id/promote', adminAuth, timetableController.promoteTerm);
router.post('/terms/:id/edit', adminAuth, timetableController.updateTerm);

// Offerings management per term (list, edit, update, delete)
router.get('/offerings', adminRequire, timetableController.listOfferingsByTerm);
router.get('/offerings/:id/edit', adminRequire, timetableController.renderOfferingEditForm);
router.post('/offerings/:id/edit', adminAuth, timetableController.updateOffering);
router.post('/offerings/:id/delete', adminAuth, timetableController.deleteOffering);

module.exports = router;
