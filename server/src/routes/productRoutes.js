const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireRole } = require('../middleware/auth');

router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.post('/', requireRole('admin'), productController.addProduct);
router.put('/:id', requireRole('admin'), productController.editProduct);
router.delete('/:id', requireRole('admin'), productController.deleteProduct);

module.exports = router;
