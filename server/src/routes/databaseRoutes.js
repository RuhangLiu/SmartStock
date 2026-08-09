const express = require('express');
const controller = require('../controllers/databaseController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('admin'));
router.get('/tables', controller.listTables);
router.get('/:table', controller.getTableRows);

module.exports = router;

