const express = require('express');
const controller = require('../controllers/operationsController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/orders', controller.getOrders);
router.post('/orders', requireRole('admin'), controller.addOrder);
router.put('/orders/:id', requireRole('admin'), controller.updateOrder);
router.get('/customers', controller.getCustomers);
router.post('/customers', requireRole('admin'), controller.addCustomer);
router.get('/settings', controller.getSettings);
router.put('/settings', requireRole('admin'), controller.updateSettings);

module.exports = router;
