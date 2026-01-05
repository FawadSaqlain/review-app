const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const loginRequire = require('../middleware/loginRequire');

// render rating form (student must be logged in)
router.get('/form', loginRequire, ratingController.renderForm);

// list offerings for student to pick and give a rating
router.get('/give', loginRequire, ratingController.renderGiveList);

// create rating (student)
router.post('/', loginRequire, ratingController.create);

// update rating (student, owner, within 7 days)
router.put('/:id', loginRequire, ratingController.update);

// view ratings for offering (login required now)
router.get('/offering/:offering', loginRequire, ratingController.viewForOffering);
// Legacy ratings index HTML view was previously mounted at '/'.
// This route is disabled so that the React SPA '/ratings' page can own that path.
// If you still need the old server-rendered table view, mount it on a different
// URL such as '/legacy' instead of the main ratings index.
// router.get('/', loginRequire, ratingController.viewForOffering);

// render edit form for an existing rating (student owner, within edit window)
router.get('/:id/edit', loginRequire, ratingController.renderEditForm);

module.exports = router;
