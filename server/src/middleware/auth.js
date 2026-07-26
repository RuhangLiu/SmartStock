const { db } = require('../models/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

  const session = db.prepare(`
    SELECT users.id, users.name, users.email, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > datetime('now')
  `).get(token);

  if (!session) return res.status(401).json({ success: false, message: 'Session expired or invalid' });
  req.user = session;
  req.token = token;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
