const { db } = require('../models/db');
const { recordInventoryMovement } = require('../models/inventoryMovement');

exports.getSales = (req, res) => {
  const sales = db.prepare(`
    SELECT
      sales.id, sales.product_id, products.name AS product_name, products.sku,
      sales.quantity_sold, sales.total_price, sales.destination_region,
      sales.sales_channel, sales.sale_date
    FROM sales
    JOIN products ON products.id = sales.product_id
    ORDER BY sales.sale_date DESC, sales.id DESC
  `).all();
  res.json({ success: true, data: sales });
};

exports.recordSale = (req, res) => {
  const productId = Number(req.body.product_id);
  const quantitySold = Number(req.body.quantity_sold);
  const destinationRegion = String(req.body.destination_region || 'United States').trim();
  const salesChannel = String(req.body.sales_channel || 'Online Store').trim();

  if (!Number.isInteger(productId) || !Number.isInteger(quantitySold) || quantitySold <= 0) {
    return res.status(400).json({ success: false, message: 'Select a product and enter a valid quantity' });
  }

  db.exec('BEGIN');
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) throw new Error('Product not found');
    if (product.quantity < quantitySold) throw new Error('Insufficient stock');

    const totalPrice = product.price * quantitySold;
    const info = db.prepare(`
      INSERT INTO sales
        (product_id, quantity_sold, total_price, sale_date, destination_region, sales_channel)
      VALUES (?, ?, ?, datetime('now'), ?, ?)
    `).run(productId, quantitySold, totalPrice, destinationRegion, salesChannel);
    db.prepare(`
      UPDATE products
      SET quantity = quantity - ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(quantitySold, productId);
    recordInventoryMovement({
      product,
      movementType: 'SALE',
      quantityChange: -quantitySold,
      quantityBefore: Number(product.quantity),
      quantityAfter: Number(product.quantity) - quantitySold,
      reason: `Sale through ${salesChannel} to ${destinationRegion}`,
      referenceType: 'SALE',
      referenceId: Number(info.lastInsertRowid),
      user: req.user
    });
    db.exec('COMMIT');

    const sale = db.prepare(`
      SELECT sales.*, products.name AS product_name, products.sku
      FROM sales JOIN products ON products.id = sales.product_id
      WHERE sales.id = ?
    `).get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    db.exec('ROLLBACK');
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getReport = (req, res) => {
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(total_price), 0) AS total_revenue,
      COALESCE(SUM(quantity_sold), 0) AS units_sold,
      COUNT(*) AS sales_count
    FROM sales
  `).get();
  const bestSeller = db.prepare(`
    SELECT products.name, products.sku, SUM(sales.quantity_sold) AS units
    FROM sales JOIN products ON products.id = sales.product_id
    GROUP BY products.id
    ORDER BY units DESC
    LIMIT 1
  `).get();
  const byCategory = db.prepare(`
    SELECT category, SUM(quantity) AS quantity
    FROM products
    GROUP BY category
    ORDER BY quantity DESC
  `).all();
  const byRegion = db.prepare(`
    SELECT destination_region AS region, SUM(total_price) AS revenue, SUM(quantity_sold) AS units
    FROM sales
    GROUP BY destination_region
    ORDER BY revenue DESC
  `).all();
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', sale_date) AS month, SUM(total_price) AS revenue
    FROM sales
    GROUP BY month
    ORDER BY month ASC
    LIMIT 12
  `).all();
  const inventory = db.prepare(`
    SELECT
      COUNT(*) AS total_products,
      COALESCE(SUM(quantity), 0) AS total_inventory,
      COALESCE(SUM(quantity * cost), 0) AS inventory_cost,
      COALESCE(SUM(quantity * price), 0) AS inventory_retail_value,
      SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count
    FROM products
  `).get();
  const pendingOrders = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('Delivered', 'Cancelled')").get();
  const customers = db.prepare('SELECT COUNT(*) AS count FROM customers').get();

  res.json({
    success: true,
    data: {
      ...summary,
      ...inventory,
      pending_orders: Number(pendingOrders.count),
      total_customers: Number(customers.count),
      best_seller: bestSeller || null,
      by_category: byCategory,
      by_region: byRegion,
      monthly
    }
  });
};
