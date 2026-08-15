const express = require('express');
const controller = require('../controllers/inventoryController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/movements', controller.getMovements);
router.post('/adjustments', requireRole('admin'), controller.adjustInventory);

module.exports = router;
