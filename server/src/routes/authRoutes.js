const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);
router.post('/register', requireAuth, requireRole('admin'), authController.register);

module.exports = router;
