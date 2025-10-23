const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, VerificationToken } = require('../models');
const Audit = require('../models').Audit;
const Verification = require('../models').VerificationToken;
const emailUtil = require('../utils/email');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const blacklist = require('../utils/tokenBlacklist');

// Signup (student)
exports.signup = async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email and password required' } });

    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ success: false, error: { code: 'ERR_CONFLICT', message: 'Email already registered' } });

    // Validate CUI Vehari official email format:
    // Examples: fa22-bse-031@cuivehari.edu.pk or sp22-ben-031@cuivehari.edu.pk
    // Pattern: ^(fa|sp)(\d{2})-([a-z]{2,4})-(\d{3})@cuivehari\.edu\.pk$
    const cuiPattern = /^(fa|sp)(\d{2})-([a-z]{2,4})-(\d{3})@cuivehari\.edu\.pk$/i;
    const m = normalizedEmail.match(cuiPattern);
    if (!m) {
      return res.status(400).json({ success: false, error: { code: 'ERR_INVALID_EMAIL', message: 'Please use your CUI Vehari email in the format fa22-bse-031@cuivehari.edu.pk or sp22-ben-031@cuivehari.edu.pk' } });
    }

    // parse parts
    const season = m[1].toLowerCase(); // 'fa' or 'sp'
    const yearTwo = m[2]; // e.g., '22'
    const degreeShort = m[3].toLowerCase(); // e.g., 'bse' or 'ben'
    const rollStr = m[4]; // '031'

    // Compute intake year full (assume 20xx unless near future) - use 2000 + two-digit
    const intakeYear = 2000 + parseInt(yearTwo, 10);

    // Compute semesterNumber as the count of half-year semesters since intake.
    // We model two periods per year:
    //  - Period 0: months Feb(2) - Sep(9)
    //  - Period 1: months Oct(10) - Jan(1) (January belongs to previous year's period 1)
    // Map intake season to a period index: 'fa' -> period 1 of intake year, 'sp' -> period 0 of intake year.
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    const getPeriodIndexForDate = (d) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (m === 1) {
        // Jan belongs to previous year's period 1
        return (y - 1) * 2 + 1;
      }
      if (m >= 2 && m <= 9) {
        return y * 2 + 0;
      }
      // Oct-Dec
      return y * 2 + 1;
    };

    const currentPeriodIndex = getPeriodIndexForDate(now);
    // intake period index (fall -> period 1, spring -> period 0)
    const intakePeriodIndex = (season === 'fa') ? (intakeYear * 2 + 1) : (intakeYear * 2 + 0);

    let semesterNumber = currentPeriodIndex - intakePeriodIndex + 1;
    if (!Number.isFinite(semesterNumber) || semesterNumber < 1) semesterNumber = 1;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // create inactive user — will be activated after OTP verification
    // normalize name into embedded shape expected by User schema
    let nameObj = null;
    if (typeof name === 'string' && name.trim().length > 0) {
      nameObj = { first: name.trim() };
    } else if (name && typeof name === 'object') {
      // accept { first, last }
      nameObj = { first: name.first || '', last: name.last || '' };
    }

    // persist intake/degree/roll/semester info on the user record for eligibility checks later
    const user = new User({
      email: normalizedEmail,
      passwordHash,
      role: 'student',
      name: nameObj,
      studentId,
      isActive: false,
      intake: { season, year: intakeYear },
      degreeShort,
      rollNumber: rollStr,
      semesterNumber
    });
    await user.save();

    // create OTP token (6-digit) and store hashed
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

  await Verification.create({ email: normalizedEmail, user: user._id, tokenHash, purpose: 'signup', campus: 'CUI-Vehari', expiresAt });

    // send OTP to university email
    try {
      const subject = 'COMSATS Vehari - Account Verification OTP';
      const text = `Your verification code is: ${otp}. It expires in 15 minutes.`;
      console.log('sending signup email to', normalizedEmail,'with OTP', otp);
      // await emailUtil.send({ to: normalizedEmail, subject, text });
    } catch (sendErr) {
      console.warn('failed to send email, returning OTP in response for dev', sendErr);
      // in dev mode return token; in prod we wouldn't do this
      await Audit.create({ action: 'user.signup.emailFail', actor: user._id, targetType: 'User', targetId: user._id, details: { error: String(sendErr) } });
      return res.status(201).json({ success: true, data: { id: user._id, email: user.email, otpForDev: otp } });
    }

    await Audit.create({ action: 'user.signup', actor: user._id, targetType: 'User', targetId: user._id });

    return res.status(201).json({ success: true, data: { id: user._id, email: user.email, message: 'OTP sent to your university email' } });
  } catch (err) {
    // handle duplicate key (race) - return 409 conflict
    if (err && (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000))) {
      // Duplicate key (email) - warn and return 409 without full stack to reduce noise
      const dup = err.keyValue && err.keyValue.email ? err.keyValue.email : (err.message || 'duplicate key');
      console.warn(`signup conflict: duplicate email ${dup}`);
      return res.status(409).json({ success: false, error: { code: 'ERR_CONFLICT', message: 'Email already registered' } });
    }

    console.error('signup error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// verify signup: POST /verify-signup { email, otp }
exports.verifySignup = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email and otp required' } });

    const normalizedEmail = email.toLowerCase();
    const record = await Verification.findOne({ email: normalizedEmail, purpose: 'signup' }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ success: false, error: { code: 'ERR_INVALID_TOKEN', message: 'No verification token found' } });
    if (record.expiresAt < new Date()) return res.status(400).json({ success: false, error: { code: 'ERR_EXPIRED_TOKEN', message: 'Token expired' } });

    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== record.tokenHash) return res.status(400).json({ success: false, error: { code: 'ERR_INVALID_TOKEN', message: 'Invalid OTP' } });

    // activate user
    await User.findByIdAndUpdate(record.user, { isActive: true });
    await Audit.create({ action: 'user.verifySignup', actor: record.user, targetType: 'User', targetId: record.user });

    return res.status(200).json({ success: true, data: { message: 'Account verified. You may now login.' } });
  } catch (err) {
    console.error('verifySignup error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// Resend signup OTP — POST { email }
exports.resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email required' } });

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ success: false, error: { code: 'ERR_NOT_FOUND', message: 'User not found' } });

    // create new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await Verification.create({ email: normalizedEmail, user: user._id, tokenHash, purpose: 'signup', campus: 'CUI-Vehari', expiresAt });

    // send
    try {
      const subject = 'COMSATS Vehari - Account Verification OTP (resend)';
      const text = `Your verification code is: ${otp}. It expires in 15 minutes.`;
      await emailUtil.send({ to: normalizedEmail, subject, text });
    } catch (sendErr) {
      console.warn('resend signup email failed', sendErr);
      await Audit.create({ action: 'user.signup.resend.emailFail', actor: user._id, targetType: 'User', targetId: user._id, details: { error: String(sendErr) } });
      return res.status(200).json({ success: true, data: { message: 'OTP resent (dev)', otpForDev: otp } });
    }

    await Audit.create({ action: 'user.signup.resend', actor: user._id, targetType: 'User', targetId: user._id });
    return res.status(200).json({ success: true, data: { message: 'OTP resent to your email' } });
  } catch (err) {
    console.error('resendSignupOtp error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};


// Login (student or admin)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email and password required' } });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid credentials' } });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid credentials' } });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await Audit.create({ action: 'user.login', actor: user._id, targetType: 'User', targetId: user._id });

    // indicate whether the user has completed their profile
    const profileComplete = !!user.profileComplete;

  // also set cookie for server-side rendered pages
  try { res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 }); } catch (e) {}
  return res.status(200).json({ success: true, data: { token, expiresIn: JWT_EXPIRES_IN, user: { id: user._id, email: user.email, role: user.role, profileComplete } } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// GET /api/auth/me - return current user profile (for client-side checks)
exports.me = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    // return user fields safe for client
    const u = req.user.toObject ? req.user.toObject() : req.user;
    // remove sensitive fields
    delete u.passwordHash;
    delete u.__v;
    return res.json({ success: true, data: { user: u } });
  } catch (err) {
    console.error('auth.me error', err);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

// render complete profile page
exports.renderCompleteProfile = async (req, res) => {
  try {
    let user = null;
    // if authenticated, use req.user, otherwise allow ?email= for dev flow
    if (req && req.user) user = req.user;
    else {
      const email = req.query.email || '';
      if (email) user = await User.findOne({ email: email.toLowerCase() });
    }
    return res.render('complete-profile', { title: 'Complete Profile', user });
  } catch (err) {
    console.error('renderCompleteProfile error', err);
    return res.status(500).send('Server error');
  }
};

// POST /api/auth/complete-profile
exports.completeProfile = async (req, res) => {
  try {
    // prefer authenticated user if available
    const { section, phone, cgpa } = req.body;
    let user = null;
    if (req && req.user) user = req.user;
    else {
      const email = req.body.email;
      if (!email) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email required' } });
      user = await User.findOne({ email: email.toLowerCase() });
    }
    if (!user) return res.status(404).json({ success: false, error: { code: 'ERR_NOT_FOUND', message: 'User not found' } });

  // only allow profile completion if user is active (and optionally verified)
  user.section = section || user.section;
  user.phone = phone || user.phone;
  // store CGPA only if semesterNumber > 1
  if (cgpa && user.semesterNumber && user.semesterNumber > 1) user.cgpa = Number(cgpa);
    // handle optional uploaded university ID image (express-fileupload)
    try {
      if (req.files && req.files.idCard) {
        const file = req.files.idCard;
        // basic server-side validation
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return res.status(400).json({ success: false, error: { code: 'ERR_INVALID_FILE', message: 'Only image files are allowed (png, jpg, gif, webp)' } });
        }

        // size is already limited by middleware, but double-check
        const MAX = 1 * 1024 * 1024; // 1MB
        if (file.size > MAX) {
          return res.status(400).json({ success: false, error: { code: 'ERR_FILE_TOO_LARGE', message: 'File too large (max 1MB)' } });
        }

        const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        // remove previous file if present
        if (user.idCardImage) {
          try {
            const prev = path.join(__dirname, '..', 'public', user.idCardImage.replace(/^\//, ''));
            if (fs.existsSync(prev)) fs.unlinkSync(prev);
          } catch (e) {
            console.warn('failed to remove previous idCard image', e && e.message ? e.message : e);
          }
        }

        // preserve extension if available
        const originalExt = path.extname(file.name) || '';
        const ext = originalExt || (file.mimetype === 'image/png' ? '.png' : '.jpg');
        const filename = `${user._id.toString()}-${Date.now()}${ext}`;
        const dest = path.join(uploadsDir, filename);

        // express-fileupload exposes mv
        await new Promise((resolve, reject) => {
          file.mv(dest, (err) => err ? reject(err) : resolve());
        });

        user.idCardImage = '/uploads/' + filename;
      }
    } catch (fileErr) {
      console.error('file upload error', fileErr);
      return res.status(500).json({ success: false, error: { code: 'ERR_FILE', message: 'Failed to process uploaded file' } });
    }

    user.profileComplete = true;
    await user.save();

    await Audit.create({ action: 'user.completeProfile', actor: user._id, targetType: 'User', targetId: user._id });

    return res.status(200).json({ success: true, data: { message: 'Profile updated' } });
  } catch (err) {
    console.error('completeProfile error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// render profile view
exports.viewProfile = async (req, res) => {
  try {
    let user = null;
    if (req && req.user) user = req.user;
    else {
      const email = req.query.email || '';
      if (!email) return res.status(400).send('Email required');
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).send('User not found');
    }
    return res.render('profile', { title: 'My Profile', user });
  } catch (err) {
    console.error('viewProfile error', err);
    return res.status(500).send('Server error');
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    // determine token from Authorization header, request body, or cookies
    const auth = (req.headers.authorization || req.headers.Authorization || '').split(' ');
    let token = auth.length === 2 && auth[0].toLowerCase() === 'bearer' ? auth[1] : (req.body && req.body.token ? req.body.token : null);
    if (!token && req.cookies) {
      token = req.cookies.adminToken || req.cookies.token || null;
    }

    // if token available, compute expiry and add to blacklist
    if (token) {
      let payload = null;
      try { payload = jwt.decode(token); } catch (e) { payload = null; }
      let expMs = Date.now() + 3600 * 1000; // default 1h
      if (payload && payload.exp) expMs = payload.exp * 1000;
      blacklist.add(token, expMs);
      await Audit.create({ action: 'user.logout', actor: (req.user && req.user._id) || null, targetType: 'User', targetId: (req.user && req.user._id) || null });
    } else {
      // no token provided; still record a logout audit and clear cookies
      await Audit.create({ action: 'user.logout', actor: (req.user && req.user._id) || null, targetType: 'User', targetId: (req.user && req.user._id) || null, details: { note: 'logout-no-token' } });
    }

    // clear cookies if present (best-effort)
    try { res.clearCookie('adminToken'); res.clearCookie('token'); } catch (e) {}
    return res.status(200).json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// Admin login: dedicated endpoint that only allows users with role 'admin'
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email and password required' } });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid credentials' } });

    if (user.role !== 'admin') return res.status(403).json({ success: false, error: { code: 'ERR_FORBIDDEN', message: 'Admin access required' } });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid credentials' } });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await Audit.create({ action: 'admin.login', actor: user._id, targetType: 'User', targetId: user._id });

    // set secure cookie for admin session (HttpOnly)
    try {
      res.cookie('adminToken', token, { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 });
    } catch (e) { /* ignore cookie set failures */ }

    return res.status(200).json({ success: true, data: { token, expiresIn: JWT_EXPIRES_IN, user: { id: user._id, email: user.email, role: user.role } } });
  } catch (err) {
    console.error('adminLogin error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};

// Forgot password — generate a one-time token and (placeholder) send via email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { code: 'ERR_VALIDATION', message: 'Email required' } });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ success: true, data: { message: 'If the email exists, a reset link will be sent' } });

    // create a token (short-lived) — store hashed in audit/details for now; in production use a dedicated passwordReset collection
    const token = crypto.randomBytes(20).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await Audit.create({ action: 'user.forgotPassword', actor: user._id, targetType: 'User', targetId: user._id, details: { tokenHash, createdAt: new Date() } });

    // TODO: integrate email provider (Nodemailer/SendGrid). For now, return token in response for manual testing.
    return res.status(200).json({ success: true, data: { message: 'Password reset token generated (development)', token } });
  } catch (err) {
    console.error('forgotPassword error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};
