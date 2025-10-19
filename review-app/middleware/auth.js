const jwt = require('jsonwebtoken');
const User = require('../models').User;
const blacklist = require('../utils/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

module.exports = async function auth(req, res, next) {
  try {
  const auth = req.headers.authorization || req.headers.Authorization || req.query.token || (req.cookies && (req.cookies.token || req.cookies.adminToken)) || null;
    if (!auth) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Authorization required' } });

    const parts = String(auth).split(' ');
    let token = null;
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
    else token = parts[0];

    if (!token) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Authorization token missing' } });

    if (blacklist.isBlacklisted(token)) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Token revoked' } });

  let payload = null;
  try { payload = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid or expired token' } }); }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, error: { code: 'ERR_AUTH', message: 'Invalid token user' } });

    req.user = user;
    req.authToken = token;
    next();
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
  }
};
