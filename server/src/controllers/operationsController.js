const { db } = require('../models/db');

exports.getOrders = (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all() });
};

exports.addOrder = (req, res) => {
  const supplier = String(req.body.supplier || '').trim();
  const productName = String(req.body.product_name || '').trim();
  const quantity = Number(req.body.quantity);
  const status = String(req.body.status || 'Pending').trim();
  const destinationRegion = String(req.body.destination_region || 'United States').trim();
  const orderType = req.body.order_type === 'International' ? 'International' : 'Purchase';
  if (!supplier || !productName || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Supplier, product, and a valid quantity are required' });
  }
  const info = db.prepare(`
    INSERT INTO orders (supplier, product_name, quantity, status, destination_region, order_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(supplier, productName, quantity, status, destinationRegion, orderType);
  res.status(201).json({ success: true, data: db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid) });
};

exports.updateOrder = (req, res) => {
  const status = String(req.body.status || '').trim();
  const allowed = ['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid order status' });
  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (Number(info.changes) === 0) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id)) });
};

exports.getCustomers = (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM customers ORDER BY total_purchases DESC, name ASC').all() });
};

exports.addCustomer = (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const region = String(req.body.region || 'United States').trim();
  if (!name || !email) return res.status(400).json({ success: false, message: 'Customer name and email are required' });
  const info = db.prepare(`
    INSERT INTO customers (name, email, phone, region, total_purchases)
    VALUES (?, ?, ?, ?, 0)
  `).run(name, email, phone, region);
  res.status(201).json({ success: true, data: db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid) });
};

exports.deleteCustomer = (req, res) => {
  const customerId = Number(req.params.id);
  const customer = Number.isInteger(customerId) && customerId > 0
    ? db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId)
    : null;
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  if (Number(customer.total_purchases) > 0) {
    return res.status(409).json({ success: false, message: 'Customers with purchase history cannot be deleted' });
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
  res.json({ success: true, data: { id: customerId, name: customer.name } });
};

exports.getSettings = (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM settings WHERE id = 1').get() });
};

exports.updateSettings = (req, res) => {
  const storeName = String(req.body.store_name || '').trim();
  const storeEmail = String(req.body.store_email || '').trim();
  const defaultThreshold = Number(req.body.default_threshold);
  const adminName = String(req.body.admin_name || '').trim();
  const currency = String(req.body.currency || 'USD').trim().toUpperCase();
  if (!storeName || !storeEmail || !Number.isInteger(defaultThreshold) || defaultThreshold < 0) {
    return res.status(400).json({ success: false, message: 'Complete all settings fields with valid values' });
  }
  db.prepare(`
    UPDATE settings SET
      store_name = ?, store_email = ?, default_threshold = ?, admin_name = ?, currency = ?
    WHERE id = 1
  `).run(storeName, storeEmail, defaultThreshold, adminName, currency);
  res.json({ success: true, data: db.prepare('SELECT * FROM settings WHERE id = 1').get() });
};
