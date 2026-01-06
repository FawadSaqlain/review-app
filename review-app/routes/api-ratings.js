const express = require('express');
const router = express.Router();
const api = require('../controllers/ratingApiController');
const ratingController = require('../controllers/ratingController');
const adminAuth = require('../middleware/adminAuth');
const loginRequire = require('../middleware/loginRequire');

// list ratings with filters (login required so we can enforce profile completion for students)
router.get('/', loginRequire, api.list);
// create a new rating (student JSON API used by React Give Review form)
router.post('/', loginRequire, ratingController.create);
router.get('/summary', api.summary);

// list stored summaries (inactive terms only)
router.get('/summaries', api.listSummaries);

// list offerings the current student can rate (JSON version of Give Review list)
router.get('/give-options', loginRequire, api.giveOptions);

// get single rating
router.get('/item/:id', loginRequire, api.getOne);

// admin update
router.put('/:id', adminAuth, api.adminUpdate);

module.exports = router;
