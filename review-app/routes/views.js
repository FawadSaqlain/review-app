const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));
router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.get('/forgot-password', (req, res) => res.render('forgot-password', { title: 'Forgot Password' }));
const adminRequire = require('../middleware/adminRequire');
const loginRequire = require('../middleware/loginRequire');
router.get('/admin/login', (req, res) => res.render('admin-login', { title: 'Admin Login' }));
// Use manual class add page instead of timetable upload
router.get('/admin/class/add', adminRequire, (req, res) => res.render('admin-add-class', { title: 'Add Class', user: req.user }));
router.get('/verify-signup', (req, res) => {
	const email = req.query.email || '';
	res.render('verify-signup', { title: 'Verify Account', email });
});
router.get('/complete-profile', loginRequire, authController.renderCompleteProfile);
router.get('/profile', loginRequire, authController.viewProfile);

module.exports = router;
