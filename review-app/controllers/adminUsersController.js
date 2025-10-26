const { User, Audit } = require('../models');
const bcrypt = require('bcrypt');

// List users (paginated basic)
exports.list = async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = 50;
    const filter = q ? { $or: [{ email: new RegExp(q, 'i') }, { 'name.first': new RegExp(q, 'i') }, { 'name.last': new RegExp(q, 'i') }] } : {};
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ email: 1 }).skip((page - 1) * limit).limit(limit).lean();
    return res.render('admin-users-list', { title: 'Manage Users', users, page, total, q });
  } catch (err) {
    console.error('adminUsers.list error', err);
    return res.status(500).send('Server error');
  }
};

// Render new user form
exports.renderCreate = async (req, res) => {
  return res.render('admin-user-form', { title: 'Create User', user: null });
};

// helper: parse CUI email like fa22-bse-031@cuivehari.edu.pk
function parseCuiEmail(email) {
  const m = (email || '').toLowerCase().match(/^(fa|sp)(\d{2})-([a-z]{2,4})-(\d{3})@cuivehari\.edu\.pk$/i);
  if (!m) return null;
  const season = m[1].toLowerCase();
  const yearTwo = m[2];
  const degreeShort = m[3].toLowerCase();
  const rollStr = m[4];
  const intakeYear = 2000 + parseInt(yearTwo, 10);
  return { season, yearTwo, intakeYear, degreeShort, rollStr };
}

function computeSemesterNumberFromIntake(season, intakeYear) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const getPeriodIndexForDate = (d) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (m === 1) return (y - 1) * 2 + 1;
    if (m >= 2 && m <= 9) return y * 2 + 0;
    return y * 2 + 1;
  };
  const currentPeriodIndex = getPeriodIndexForDate(now);
  const intakePeriodIndex = (season === 'fa') ? (intakeYear * 2 + 1) : (intakeYear * 2 + 0);
  let semesterNumber = currentPeriodIndex - intakePeriodIndex + 1;
  if (!Number.isFinite(semesterNumber) || semesterNumber < 1) semesterNumber = 1;
  return semesterNumber;
}

// Create user
exports.create = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, degreeShort, rollNumber, intake, semesterNumber, section, cgpa, phone } = req.body;
    if (!email || !password) return res.status(400).send('Email and password required');
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).send('Email already exists');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Try to infer intake/degree/roll if not provided
    let intakeObj = null;
    let degree = degreeShort || null;
    let roll = rollNumber || null;
    let semNum = semesterNumber ? Number(semesterNumber) : null;
    if ((!degree || !roll || !semNum) && email) {
      const parsed = parseCuiEmail(email);
      if (parsed) {
        degree = degree || parsed.degreeShort;
        roll = roll || parsed.rollStr;
        semNum = semNum || computeSemesterNumberFromIntake(parsed.season, parsed.intakeYear);
        intakeObj = { season: parsed.season, year: parsed.intakeYear };
      }
    }

    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'student',
      name: { first: firstName || '', last: lastName || '' },
      isActive: true,
      degreeShort: degree || undefined,
      rollNumber: roll || undefined,
      intake: intakeObj || undefined,
      semesterNumber: semNum || undefined,
      section: section || undefined,
      cgpa: cgpa ? Number(cgpa) : undefined,
      phone: phone || undefined
    });
    await user.save();
    await Audit.create({ action: 'admin.user.create', actor: req.user._id, targetType: 'User', targetId: user._id });
    return res.redirect('/admin/users');
  } catch (err) {
    console.error('adminUsers.create error', err);
    return res.status(500).send('Server error');
  }
};

// Render edit form
exports.renderEdit = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).send('User not found');
    return res.render('admin-user-form', { title: 'Edit User', user });
  } catch (err) {
    console.error('adminUsers.renderEdit error', err);
    return res.status(500).send('Server error');
  }
};

// Update user
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    const { email, role, firstName, lastName, isActive, degreeShort, rollNumber, intake, semesterNumber, section, cgpa, phone } = req.body;
    user.email = email ? email.toLowerCase() : user.email;
    user.role = role || user.role;
    user.name = { first: firstName || (user.name && user.name.first) || '', last: lastName || (user.name && user.name.last) || '' };
    user.isActive = typeof isActive !== 'undefined' ? !!isActive : user.isActive;
    // intake/degree/roll/semester parsing
    let semNum = semesterNumber ? Number(semesterNumber) : user.semesterNumber;
    let intakeObj = user.intake;
    let degree = degreeShort || user.degreeShort;
    let roll = rollNumber || user.rollNumber;
    if ((!degree || !roll || !semNum) && user.email) {
      const parsed = parseCuiEmail(user.email);
      if (parsed) {
        degree = degree || parsed.degreeShort;
        roll = roll || parsed.rollStr;
        semNum = semNum || computeSemesterNumberFromIntake(parsed.season, parsed.intakeYear);
        intakeObj = intakeObj || { season: parsed.season, year: parsed.intakeYear };
      }
    }
    user.degreeShort = degree || user.degreeShort;
    user.rollNumber = roll || user.rollNumber;
    user.intake = intakeObj || user.intake;
    user.semesterNumber = semNum || user.semesterNumber;
    user.section = section || user.section;
    user.cgpa = cgpa ? Number(cgpa) : user.cgpa;
    user.phone = phone || user.phone;
    // change password if provided
    if (req.body.password && req.body.password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(req.body.password, salt);
    }
    await user.save();
    await Audit.create({ action: 'admin.user.update', actor: req.user._id, targetType: 'User', targetId: user._id });
    return res.redirect('/admin/users');
  } catch (err) {
    console.error('adminUsers.update error', err);
    return res.status(500).send('Server error');
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    await User.deleteOne({ _id: req.params.id });
    await Audit.create({ action: 'admin.user.delete', actor: req.user._id, targetType: 'User', targetId: req.params.id });
    // If the request expects HTML (browser form submit), redirect back to listings for UX.
    const accept = req.headers && req.headers.accept ? req.headers.accept : '';
    if (accept.indexOf('text/html') !== -1) return res.redirect('/admin/users');
    // otherwise return JSON for API clients (e.g., fetch or Postman)
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    console.error('adminUsers.delete error', err);
    return res.status(500).send('Server error');
  }
};
