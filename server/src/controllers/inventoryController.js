const { db } = require('../models/db');
const { recordInventoryMovement } = require('../models/inventoryMovement');

const allowedTypes = new Set(['INITIAL', 'SALE', 'ADJUSTMENT', 'RETURN', 'PURCHASE']);

exports.getMovements = (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.page_size, 10) || 20));
  const productId = Number.parseInt(req.query.product_id, 10);
  const movementType = String(req.query.type || '').trim().toUpperCase();
  const search = String(req.query.search || '').trim();
  const startDate = String(req.query.start_date || '').trim();
  const endDate = String(req.query.end_date || '').trim();
  const conditions = [];
  const params = [];

  if (Number.isInteger(productId) && productId > 0) {
    conditions.push('product_id = ?');
    params.push(productId);
  }
  if (movementType) {
    if (!allowedTypes.has(movementType)) {
      return res.status(400).json({ success: false, message: 'Invalid movement type' });
    }
    conditions.push('movement_type = ?');
    params.push(movementType);
  }
  if (search) {
    conditions.push('(product_name LIKE ? OR product_sku LIKE ? OR reason LIKE ? OR created_by_name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (startDate) {
    conditions.push('date(created_at) >= date(?)');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('date(created_at) <= date(?)');
    params.push(endDate);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = Number(db.prepare(`SELECT COUNT(*) AS count FROM inventory_movements ${where}`).get(...params).count);
  const rows = db.prepare(`
    SELECT id, product_id, product_sku, product_name, movement_type, quantity_change,
      quantity_before, quantity_after, reason, reference_type, reference_id,
      created_by, created_by_name, created_at
    FROM inventory_movements
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, (page - 1) * pageSize);

  res.json({
    success: true,
    data: {
      rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize))
      }
    }
  });
};

exports.adjustInventory = (req, res) => {
  const productId = Number(req.body.product_id);
  const quantityChange = Number(req.body.quantity_change);
  const reason = String(req.body.reason || '').trim();

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ success: false, message: 'Select a valid product' });
  }
  if (!Number.isInteger(quantityChange) || quantityChange === 0) {
    return res.status(400).json({ success: false, message: 'Quantity change must be a non-zero whole number' });
  }
  if (!reason) return res.status(400).json({ success: false, message: 'Adjustment reason is required' });

  db.exec('BEGIN');
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new Error('Product not found');
    const quantityBefore = Number(product.quantity);
    const quantityAfter = quantityBefore + quantityChange;
    if (quantityAfter < 0) throw new Error('Adjustment would make inventory negative');

    db.prepare(`
      UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?
    `).run(quantityAfter, productId);
    const movement = recordInventoryMovement({
      product,
      movementType: 'ADJUSTMENT',
      quantityChange,
      quantityBefore,
      quantityAfter,
      reason,
      referenceType: 'MANUAL_ADJUSTMENT',
      user: req.user
    });
    db.exec('COMMIT');

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json({ success: true, data: { product: updatedProduct, movement } });
  } catch (error) {
    db.exec('ROLLBACK');
    const status = error.message === 'Product not found' ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};
