const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const configuredUploadDir = process.env.SMARTSTOCK_UPLOAD_DIR;
const uploadDir = configuredUploadDir
  ? path.resolve(configuredUploadDir)
  : process.env.WEBSITE_SITE_NAME
    ? '/home/data/uploads/products'
    : path.resolve(__dirname, '../../uploads/products');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}${allowedTypes.get(file.mimetype)}`);
  }
});

const uploader = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('Only JPG, PNG, and WebP images are allowed');
      error.code = 'UNSUPPORTED_IMAGE_TYPE';
      return callback(error);
    }
    callback(null, true);
  }
});

function uploadProductImage(req, res, next) {
  uploader.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image must be 5MB or smaller' });
    }
    if (error.code === 'UNSUPPORTED_IMAGE_TYPE' || error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  });
}

module.exports = { uploadDir, uploadProductImage };
