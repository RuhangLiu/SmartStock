const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireRole } = require('../middleware/auth');
const { uploadProductImage } = require('../middleware/productImageUpload');

router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.post('/image', requireRole('admin'), uploadProductImage, (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose an image to upload' });
  res.status(201).json({
    success: true,
    data: {
      image_url: `/uploads/products/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
      mime_type: req.file.mimetype
    }
  });
});
router.post('/', requireRole('admin'), productController.addProduct);
router.put('/:id', requireRole('admin'), productController.editProduct);
router.delete('/:id', requireRole('admin'), productController.deleteProduct);

module.exports = router;
