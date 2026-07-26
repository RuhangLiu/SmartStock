const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.get('/', saleController.getSales);
router.post('/', saleController.recordSale);
router.get('/report', saleController.getReport);

module.exports = router;
