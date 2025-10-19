const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminRequire = require('../middleware/adminRequire');
const controller = require('../controllers/adminUsersController');

// list
router.get('/', adminRequire, controller.list);

// new
router.get('/new', adminRequire, controller.renderCreate);
router.post('/new', adminAuth, controller.create);

// edit
router.get('/:id/edit', adminRequire, controller.renderEdit);
router.post('/:id/edit', adminAuth, controller.update);

// delete
router.post('/:id/delete', adminAuth, controller.delete);

module.exports = router;
