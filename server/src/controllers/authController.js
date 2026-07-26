const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');
const { db, hashPassword } = require('../models/db');

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const supplied = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

exports.login = (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }

  const token = randomBytes(32).toString('hex');
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, datetime('now', '+7 days'))
  `).run(token, user.id);
  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  });
};

exports.me = (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.logout = (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ success: true, data: { logged_out: true } });
};

exports.register = (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'employee';
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Name, email, and an 8-character password are required' });
  }
  try {
    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(name, email, hashPassword(password), role);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    const message = error.message.includes('UNIQUE') ? 'Email already exists' : error.message;
    res.status(400).json({ success: false, message });
  }
};
