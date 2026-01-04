const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', authController.signup);
// POST /api/auth/verify-signup
router.post('/verify-signup', authController.verifySignup);
// POST /api/auth/resend-signup-otp
router.post('/resend-signup-otp', authController.resendSignupOtp);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me - return current authenticated user
router.get('/me', auth, authController.me);

// complete profile UI and API
router.get('/complete-profile', authController.renderCompleteProfile);
// allow authenticated POST to complete-profile; also supports an unauthenticated body-based flow
router.post('/complete-profile', auth, authController.completeProfile);
// profile view: allow GET with auth or ?email= query (rendering)
router.get('/profile', auth, authController.viewProfile);

// logout
router.post('/logout', auth, authController.logout);

// POST /api/auth/admin/login
router.post('/admin/login', authController.adminLogin);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);
// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
