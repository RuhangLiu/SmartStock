const express = require('express');
const controller = require('../controllers/aiController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('admin'));
router.post('/briefing', controller.generateBriefing);

module.exports = router;

