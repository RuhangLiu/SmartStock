const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('fs');
const { randomBytes, scryptSync } = require('crypto');
const path = require('path');

const configuredDbPath = process.env.SMARTSTOCK_DB_PATH;
const databaseDir = configuredDbPath
  ? path.dirname(path.resolve(configuredDbPath))
  : path.resolve(__dirname, '../../database');
mkdirSync(databaseDir, { recursive: true });

const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.join(databaseDir, 'smartstock.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity_sold INTEGER NOT NULL,
  total_price REAL NOT NULL,
  sale_date TEXT NOT NULL DEFAULT (datetime('now')),
  destination_region TEXT DEFAULT 'United States',
  sales_channel TEXT DEFAULT 'Online Store',
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  destination_region TEXT DEFAULT 'United States',
  order_type TEXT DEFAULT 'Purchase',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  region TEXT DEFAULT 'United States',
  total_purchases REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Indigo Trail Studio',
  store_email TEXT NOT NULL DEFAULT 'ops@indigotrail.com',
  default_threshold INTEGER NOT NULL DEFAULT 5,
  admin_name TEXT NOT NULL DEFAULT 'Alicia Chen',
  currency TEXT NOT NULL DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('INITIAL', 'SALE', 'ADJUSTMENT', 'RETURN', 'PURCHASE')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  created_by INTEGER,
  created_by_name TEXT NOT NULL DEFAULT 'System',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
`);

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('products', 'sku', 'TEXT');
addColumnIfMissing('products', 'origin', 'TEXT');
addColumnIfMissing('products', 'material', 'TEXT');
addColumnIfMissing('products', 'dye_technique', 'TEXT');
addColumnIfMissing('products', 'cost', 'REAL NOT NULL DEFAULT 0');
addColumnIfMissing('products', 'image_url', 'TEXT');
addColumnIfMissing('sales', 'destination_region', "TEXT DEFAULT 'United States'");
addColumnIfMissing('sales', 'sales_channel', "TEXT DEFAULT 'Online Store'");

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;');
db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id, created_at DESC);');
db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type, created_at DESC);');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const seedTransaction = () => {
  db.exec('BEGIN');
  try {
    const userCount = Number(db.prepare('SELECT COUNT(*) AS count FROM users').get().count);
    if (userCount === 0) {
      const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
      insertUser.run('Alicia Chen', 'admin@smartstock.com', hashPassword('admin123'), 'admin');
      insertUser.run('Jordan Lee', 'employee@smartstock.com', hashPassword('employee123'), 'employee');
    }

    const productCount = Number(db.prepare('SELECT COUNT(*) AS count FROM products').get().count);
    if (productCount === 0) {
      const insertProduct = db.prepare(`
        INSERT INTO products
          (sku, name, origin, material, dye_technique, category, price, cost, quantity, low_stock_threshold, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const products = [
        ['DW-SCF-001', 'Cloud-Dyed Silk Scarf', 'Dali, Yunnan', 'Mulberry Silk', 'Bound Resist', 'Accessories', 48, 19, 4, 5, '/assets/products/cloud-scarf.jpg'],
        ['DW-TOT-002', 'Ocean Shibori Tote', 'Dali, Yunnan', 'Cotton Canvas', 'Stitched Resist', 'Bags', 72, 28, 5, 5, '/assets/products/ocean-tote.jpg'],
        ['DW-CSH-003', 'Indigo Linen Cushion', 'Nantong, Jiangsu', 'Linen Blend', 'Fold Resist', 'Home Textiles', 58, 23, 18, 8, '/assets/products/indigo-cushion.jpg'],
        ['DW-RUN-004', 'Starlight Table Runner', 'Zhoucheng, Yunnan', 'Cotton Linen', 'Star Binding', 'Table Linens', 86, 34, 24, 8, '/assets/products/table-runner.jpg'],
        ['DW-KMN-005', 'Moonfold Cotton Kimono', 'Dali, Yunnan', 'Organic Cotton', 'Fold Resist', 'Apparel', 128, 52, 12, 6, '/assets/products/cotton-kimono.jpg'],
        ['DW-NPK-006', 'Indigo Napkin Set', 'Nantong, Jiangsu', 'Linen', 'Bound Resist', 'Table Linens', 42, 16, 36, 10, '/assets/products/napkin-set.jpg'],
        ['DW-WAL-007', 'Tidal Wall Hanging', 'Zhoucheng, Yunnan', 'Cotton', 'Stitched Resist', 'Home Textiles', 112, 44, 7, 5, '/assets/products/wall-hanging.jpg'],
        ['DW-POU-008', 'Wave-Dyed Travel Pouch', 'Dali, Yunnan', 'Cotton Canvas', 'Pole Wrap', 'Accessories', 35, 13, 43, 12, '/assets/products/travel-pouch.jpg']
      ];
      products.forEach((product) => insertProduct.run(...product));
    }

    const orderCount = Number(db.prepare('SELECT COUNT(*) AS count FROM orders').get().count);
    if (orderCount === 0) {
      const insertOrder = db.prepare(`
        INSERT INTO orders (supplier, product_name, quantity, status, destination_region, order_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertOrder.run('Zhoucheng Indigo Workshop', 'Cloud-Dyed Silk Scarf', 20, 'Pending', 'China', 'Purchase');
      insertOrder.run('Nantong Textile Collective', 'Indigo Linen Cushion', 30, 'Delivered', 'China', 'Purchase');
      insertOrder.run('Online Store', 'Moonfold Cotton Kimono', 2, 'In Transit', 'United Kingdom', 'International');
    }

    const customerCount = Number(db.prepare('SELECT COUNT(*) AS count FROM customers').get().count);
    if (customerCount === 0) {
      const insertCustomer = db.prepare(`
        INSERT INTO customers (name, email, phone, region, total_purchases)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertCustomer.run('Mina Patel', 'mina@example.com', '+1 312 555 0101', 'United States', 240.50);
      insertCustomer.run('Luis Gomez', 'luis@example.com', '+34 612 555 102', 'European Union', 180);
      insertCustomer.run('Amelia Brooks', 'amelia@example.com', '+44 7700 900123', 'United Kingdom', 324);
    }

    db.prepare(`
      INSERT OR IGNORE INTO settings
        (id, store_name, store_email, default_threshold, admin_name, currency)
      VALUES (1, 'Indigo Trail Studio', 'ops@indigotrail.com', 5, 'Alicia Chen', 'USD')
    `).run();

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

seedTransaction();

const productImages = [
  ['DW-SCF-001', '/assets/products/cloud-scarf.jpg'],
  ['DW-TOT-002', '/assets/products/ocean-tote.jpg'],
  ['DW-CSH-003', '/assets/products/indigo-cushion.jpg'],
  ['DW-RUN-004', '/assets/products/table-runner.jpg'],
  ['DW-KMN-005', '/assets/products/cotton-kimono.jpg'],
  ['DW-NPK-006', '/assets/products/napkin-set.jpg'],
  ['DW-WAL-007', '/assets/products/wall-hanging.jpg'],
  ['DW-POU-008', '/assets/products/travel-pouch.jpg']
];
const setProductImage = db.prepare(`
  UPDATE products SET image_url = ?
  WHERE sku = ? AND (image_url IS NULL OR image_url = '')
`);
productImages.forEach(([sku, imageUrl]) => setProductImage.run(imageUrl, sku));

db.prepare(`
  INSERT INTO inventory_movements (
    product_id, product_sku, product_name, movement_type, quantity_change,
    quantity_before, quantity_after, reason, created_by_name
  )
  SELECT products.id, products.sku, products.name, 'INITIAL', products.quantity,
    0, products.quantity, 'Opening balance migrated from existing inventory', 'System'
  FROM products
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory_movements WHERE inventory_movements.product_id = products.id
  )
`).run();

module.exports = { db, hashPassword };
