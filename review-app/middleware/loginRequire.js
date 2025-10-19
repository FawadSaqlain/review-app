const jwt = require('jsonwebtoken');
const User = require('../models').User;
const blacklist = require('../utils/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

module.exports = async function loginRequire(req, res, next) {
  try {
    // check cookies, Authorization header, or query token
    let token = null;
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    else if (req.cookies && req.cookies.adminToken) token = req.cookies.adminToken;
    else if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
      else token = parts[0];
    } else if (req.query && req.query.token) token = req.query.token;

    if (!token) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    if (blacklist.isBlacklisted(token)) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));

    let payload = null;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl)); }

    const user = await User.findById(payload.sub);
    if (!user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));

    req.user = user;
    next();
  } catch (err) {
    console.error('loginRequire error', err);
    return res.redirect('/login');
  }
};
