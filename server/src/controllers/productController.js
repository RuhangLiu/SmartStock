const { db } = require('../models/db');

const productFields = `
  id, sku, name, origin, material, dye_technique, category, price, cost,
  quantity, low_stock_threshold, image_url, created_at, updated_at
`;

function normalizeProduct(body) {
  return {
    sku: String(body.sku || '').trim().toUpperCase(),
    name: String(body.name || '').trim(),
    origin: String(body.origin || '').trim(),
    material: String(body.material || '').trim(),
    dye_technique: String(body.dye_technique || '').trim(),
    category: String(body.category || '').trim(),
    price: Number(body.price),
    cost: Number(body.cost),
    quantity: Number(body.quantity),
    low_stock_threshold: Number(body.low_stock_threshold),
    image_url: String(body.image_url || '').trim()
  };
}

function validateProduct(product) {
  if (!product.sku || !product.name || !product.category) return 'SKU, name, and category are required';
  if (![product.price, product.cost].every(Number.isFinite) || product.price < 0 || product.cost < 0) return 'Price and cost must be valid positive numbers';
  if (![product.quantity, product.low_stock_threshold].every(Number.isInteger) || product.quantity < 0 || product.low_stock_threshold < 0) return 'Quantity and threshold must be non-negative whole numbers';
  return null;
}

exports.getAllProducts = (req, res) => {
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  let sql = `SELECT ${productFields} FROM products WHERE 1 = 1`;
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR sku LIKE ? OR origin LIKE ? OR category LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY updated_at DESC, name ASC';

  res.json({ success: true, data: db.prepare(sql).all(...params) });
};

exports.addProduct = (req, res) => {
  const product = normalizeProduct(req.body);
  const validationError = validateProduct(product);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const info = db.prepare(`
      INSERT INTO products
        (sku, name, origin, material, dye_technique, category, price, cost, quantity, low_stock_threshold, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.sku, product.name, product.origin, product.material, product.dye_technique,
      product.category, product.price, product.cost, product.quantity, product.low_stock_threshold,
      product.image_url
    );
    const created = db.prepare(`SELECT ${productFields} FROM products WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    const message = error.message.includes('UNIQUE') ? 'SKU already exists' : error.message;
    res.status(400).json({ success: false, message });
  }
};

exports.editProduct = (req, res) => {
  const product = normalizeProduct(req.body);
  const validationError = validateProduct(product);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  try {
    const info = db.prepare(`
      UPDATE products SET
        sku = ?, name = ?, origin = ?, material = ?, dye_technique = ?, category = ?,
        price = ?, cost = ?, quantity = ?, low_stock_threshold = ?, image_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      product.sku, product.name, product.origin, product.material, product.dye_technique,
      product.category, product.price, product.cost, product.quantity, product.low_stock_threshold,
      product.image_url,
      Number(req.params.id)
    );
    if (Number(info.changes) === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    const updated = db.prepare(`SELECT ${productFields} FROM products WHERE id = ?`).get(Number(req.params.id));
    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error.message.includes('UNIQUE') ? 'SKU already exists' : error.message;
    res.status(400).json({ success: false, message });
  }
};

exports.deleteProduct = (req, res) => {
  const saleCount = Number(db.prepare('SELECT COUNT(*) AS count FROM sales WHERE product_id = ?').get(Number(req.params.id)).count);
  if (saleCount > 0) {
    return res.status(409).json({ success: false, message: 'Products with sales history cannot be deleted' });
  }
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  if (Number(info.changes) === 0) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data: { id: Number(req.params.id) } });
};

exports.getLowStockProducts = (req, res) => {
  const products = db.prepare(`
    SELECT ${productFields} FROM products
    WHERE quantity <= low_stock_threshold
    ORDER BY quantity ASC, name ASC
  `).all();
  res.json({ success: true, data: products });
};
