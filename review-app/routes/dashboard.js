const express = require('express');
const router = express.Router();
const loginRequire = require('../middleware/loginRequire');

router.get('/ratings', loginRequire, (req, res) => {
  res.render('student/ratings-dashboard', { title: 'My Ratings', currentUserId: req.user ? req.user._id : null });
});

module.exports = router;
