// Simple in-memory token blacklist with expiry. Not persistent across restarts.
const map = new Map(); // token -> expiry (ms)

function add(token, expMs) {
  if (!token) return;
  const now = Date.now();
  const ttl = Math.max(0, expMs - now);
  map.set(token, expMs);
  // schedule removal
  setTimeout(() => map.delete(token), ttl + 1000);
}

function isBlacklisted(token) {
  if (!token) return false;
  const exp = map.get(token);
  if (!exp) return false;
  if (Date.now() >= exp) { map.delete(token); return false; }
  return true;
}

module.exports = { add, isBlacklisted };
