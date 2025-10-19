const auth = require('./auth');

module.exports = async function adminAuth(req, res, next) {
  // first run general auth to populate req.user
  auth(req, res, async function(err) {
    if (err) return next(err);
    try {
      if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, error: { code: 'ERR_FORBIDDEN', message: 'Admin access required' } });
      return next();
    } catch (e) {
      console.error('adminAuth wrapper error', e);
      return res.status(500).json({ success: false, error: { code: 'ERR_INTERNAL', message: 'Server error' } });
    }
  });
};
