const express = require('express');
const router = express.Router();
const adminRequire = require('../middleware/adminRequire');

// admin dashboard for ratings
router.get('/', adminRequire, (req, res) => {
  res.render('admin/ratings-dashboard', { title: 'Ratings Dashboard (Admin)' });
});

module.exports = router;
