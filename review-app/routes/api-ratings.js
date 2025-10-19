const express = require('express');
const router = express.Router();
const api = require('../controllers/ratingApiController');
const adminAuth = require('../middleware/adminAuth');

// list ratings with filters
router.get('/', api.list);
router.get('/summary', api.summary);

// admin update
router.put('/:id', adminAuth, api.adminUpdate);

module.exports = router;
