const express = require('express');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth');
const timetableController = require('../controllers/timetableController');
const adminUsersController = require('../controllers/adminUsersController');

// JSON APIs for admin terms
router.get('/terms', adminAuth, timetableController.listTermsJson);
router.post('/terms', adminAuth, timetableController.createTerm);
router.put('/terms/:id', adminAuth, timetableController.updateTerm);
router.post('/terms/:id/activate', adminAuth, timetableController.activateTerm);
router.post('/terms/:id/promote', adminAuth, timetableController.promoteTerm);

// JSON APIs for admin offerings (optionally filtered by term via ?term=<id>)
router.get('/offerings', adminAuth, timetableController.listOfferingsByTermJson);
router.get('/offerings/:id', adminAuth, timetableController.renderOfferingEditFormJson);
router.put('/offerings/:id', adminAuth, timetableController.updateOffering);
router.delete('/offerings/:id', adminAuth, timetableController.deleteOffering);

// JSON APIs for admin class management (manual add + bulk upload)
router.post('/class/add', adminAuth, timetableController.addClassManually);
router.post('/class/upload', adminAuth, timetableController.addClassesFromXlsx);

// JSON APIs for admin users
router.get('/users', adminAuth, adminUsersController.listJson);
router.get('/users/:id', adminAuth, adminUsersController.getOneJson);
router.post('/users', adminAuth, adminUsersController.createJson);
router.put('/users/:id', adminAuth, adminUsersController.updateJson);
router.delete('/users/:id', adminAuth, adminUsersController.delete);

module.exports = router;
