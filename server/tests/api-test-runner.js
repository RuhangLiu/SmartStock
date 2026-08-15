const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartstock-api-test-'));
process.env.SMARTSTOCK_DB_PATH = path.join(testDir, 'smartstock-test.db');
process.env.SMARTSTOCK_UPLOAD_DIR = path.join(testDir, 'uploads', 'products');

const app = require('../src/app');

const results = [];
let adminToken = '';
let employeeToken = '';
let saleProductId = 0;
let deletableProductId = 0;
let orderId = 0;

async function request(baseUrl, method, endpoint, body, token) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function uploadRequest(baseUrl, endpoint, { bytes, name, type }, token) {
  const body = new FormData();
  body.append('image', new Blob([bytes], { type }), name);
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function runCase(id, api, scenario, expected, action) {
  const started = Date.now();
  try {
    const actual = await action();
    results.push({ id, api, scenario, expected, actual, status: 'Pass', duration_ms: Date.now() - started });
  } catch (error) {
    results.push({ id, api, scenario, expected, actual: error.message, status: 'Fail', duration_ms: Date.now() - started });
  }
}

async function main() {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await runCase('TC-01', 'POST /api/auth/login', 'Admin logs in with valid credentials', '200 and authentication token', async () => {
      const res = await request(baseUrl, 'POST', '/api/auth/login', { email: 'admin@smartstock.com', password: 'admin123' });
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.user.role, 'admin');
      assert.ok(res.payload.data.token);
      adminToken = res.payload.data.token;
      return `200; role=${res.payload.data.user.role}; token returned`;
    });

    await runCase('TC-02', 'POST /api/auth/login', 'Employee logs in with valid credentials', '200 and employee role', async () => {
      const res = await request(baseUrl, 'POST', '/api/auth/login', { email: 'employee@smartstock.com', password: 'employee123' });
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.user.role, 'employee');
      employeeToken = res.payload.data.token;
      return '200; employee session created';
    });

    await runCase('TC-03', 'POST /api/auth/login', 'Login with an incorrect password', '401 Unauthorized', async () => {
      const res = await request(baseUrl, 'POST', '/api/auth/login', { email: 'admin@smartstock.com', password: 'wrong-password' });
      assert.equal(res.status, 401);
      return `401; ${res.payload.message}`;
    });

    await runCase('TC-04', 'GET /api/products', 'Request protected data without a token', '401 Authentication required', async () => {
      const res = await request(baseUrl, 'GET', '/api/products');
      assert.equal(res.status, 401);
      return `401; ${res.payload.message}`;
    });

    await runCase('TC-05', 'GET /api/products', 'Admin retrieves the product catalog', '200 and seeded catalog', async () => {
      const res = await request(baseUrl, 'GET', '/api/products', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.length >= 8);
      return `200; ${res.payload.data.length} products returned`;
    });

    await runCase('TC-06', 'POST /api/products', 'Employee attempts to create a product', '403 Forbidden', async () => {
      const res = await request(baseUrl, 'POST', '/api/products', {}, employeeToken);
      assert.equal(res.status, 403);
      return `403; ${res.payload.message}`;
    });

    const saleProduct = {
      sku: 'TEST-SALE-001', name: 'API Test Scarf', origin: 'Dali, Yunnan',
      material: 'Cotton', dye_technique: 'Bound Resist', category: 'Accessories',
      price: 25, cost: 10, quantity: 10, low_stock_threshold: 3
    };

    await runCase('TC-07', 'POST /api/products', 'Admin creates a valid product', '201 and created product', async () => {
      const res = await request(baseUrl, 'POST', '/api/products', saleProduct, adminToken);
      assert.equal(res.status, 201);
      assert.equal(res.payload.data.sku, saleProduct.sku);
      saleProductId = Number(res.payload.data.id);
      return `201; product id=${saleProductId}`;
    });

    await runCase('TC-08', 'POST /api/products', 'Admin submits a duplicate SKU', '400 SKU already exists', async () => {
      const res = await request(baseUrl, 'POST', '/api/products', saleProduct, adminToken);
      assert.equal(res.status, 400);
      assert.match(res.payload.message, /SKU already exists/);
      return `400; ${res.payload.message}`;
    });

    await runCase('TC-09', 'GET /api/products?search=', 'Search catalog by SKU', '200 and one matching product', async () => {
      const res = await request(baseUrl, 'GET', '/api/products?search=TEST-SALE-001', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.length, 1);
      return `200; matched ${res.payload.data[0].name}`;
    });

    await runCase('TC-10', 'PUT /api/products/:id', 'Admin updates product quantity and price', '200 with updated values', async () => {
      const res = await request(baseUrl, 'PUT', `/api/products/${saleProductId}`, { ...saleProduct, quantity: 12, price: 30 }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(Number(res.payload.data.quantity), 12);
      assert.equal(Number(res.payload.data.price), 30);
      return '200; quantity=12; price=30';
    });

    await runCase('TC-11', 'GET /api/products/low-stock', 'Retrieve low-stock products', '200 and threshold-filtered list', async () => {
      const res = await request(baseUrl, 'GET', '/api/products/low-stock', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.every((product) => product.quantity <= product.low_stock_threshold));
      return `200; ${res.payload.data.length} low-stock products`;
    });

    await runCase('TC-12', 'POST /api/sales', 'Record a valid sale', '201, server-calculated total, stock reduced', async () => {
      const res = await request(baseUrl, 'POST', '/api/sales', {
        product_id: saleProductId, quantity_sold: 2,
        destination_region: 'Canada', sales_channel: 'Online Store'
      }, employeeToken);
      assert.equal(res.status, 201);
      assert.equal(Number(res.payload.data.total_price), 60);
      const productRes = await request(baseUrl, 'GET', '/api/products?search=TEST-SALE-001', null, adminToken);
      assert.equal(Number(productRes.payload.data[0].quantity), 10);
      return '201; total=60; stock reduced from 12 to 10';
    });

    await runCase('TC-13', 'POST /api/sales', 'Attempt sale greater than available stock', '400 Insufficient stock', async () => {
      const res = await request(baseUrl, 'POST', '/api/sales', {
        product_id: saleProductId, quantity_sold: 999,
        destination_region: 'Canada', sales_channel: 'Online Store'
      }, employeeToken);
      assert.equal(res.status, 400);
      assert.equal(res.payload.message, 'Insufficient stock');
      return `400; ${res.payload.message}`;
    });

    await runCase('TC-14', 'GET /api/sales', 'Retrieve sales history', '200 and recorded sale', async () => {
      const res = await request(baseUrl, 'GET', '/api/sales', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.length, 1);
      return `200; ${res.payload.data.length} sale returned`;
    });

    await runCase('TC-15', 'GET /api/sales/report', 'Retrieve aggregated dashboard report', '200 with revenue and inventory metrics', async () => {
      const res = await request(baseUrl, 'GET', '/api/sales/report', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(Number(res.payload.data.total_revenue), 60);
      assert.equal(Number(res.payload.data.units_sold), 2);
      return `200; revenue=${res.payload.data.total_revenue}; units=${res.payload.data.units_sold}`;
    });

    await runCase('TC-16', 'POST /api/orders', 'Admin creates an international order', '201 and order record', async () => {
      const res = await request(baseUrl, 'POST', '/api/orders', {
        supplier: 'Online Store', product_name: 'API Test Scarf', quantity: 2,
        status: 'Pending', destination_region: 'Canada', order_type: 'International'
      }, adminToken);
      assert.equal(res.status, 201);
      orderId = Number(res.payload.data.id);
      return `201; order id=${orderId}`;
    });

    await runCase('TC-17', 'PUT /api/orders/:id', 'Admin updates order status', '200 and In Transit status', async () => {
      const res = await request(baseUrl, 'PUT', `/api/orders/${orderId}`, { status: 'In Transit' }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.status, 'In Transit');
      return '200; status=In Transit';
    });

    await runCase('TC-18', 'POST /api/customers', 'Admin creates a customer', '201 and customer record', async () => {
      const res = await request(baseUrl, 'POST', '/api/customers', {
        name: 'Test Customer', email: 'test.customer@example.com',
        phone: '+1 555 0100', region: 'Canada'
      }, adminToken);
      assert.equal(res.status, 201);
      assert.equal(res.payload.data.region, 'Canada');
      return `201; customer id=${res.payload.data.id}`;
    });

    await runCase('TC-19', 'PUT /api/settings', 'Admin updates store settings', '200 and saved currency', async () => {
      const res = await request(baseUrl, 'PUT', '/api/settings', {
        store_name: 'Indigo Trail Studio', store_email: 'ops@indigotrail.com',
        default_threshold: 6, admin_name: 'Alicia Chen', currency: 'USD'
      }, adminToken);
      assert.equal(res.status, 200);
      assert.equal(Number(res.payload.data.default_threshold), 6);
      return '200; default threshold=6; currency=USD';
    });

    await runCase('TC-20', 'POST /api/auth/register', 'Admin creates a staff account', '201 and employee user', async () => {
      const res = await request(baseUrl, 'POST', '/api/auth/register', {
        name: 'Test Employee', email: 'test.employee@example.com',
        password: 'password123', role: 'employee'
      }, adminToken);
      assert.equal(res.status, 201);
      assert.equal(res.payload.data.role, 'employee');
      return `201; user id=${res.payload.data.id}; role=employee`;
    });

    await runCase('TC-21', 'DELETE /api/products/:id', 'Delete product that has sales history', '409 Conflict', async () => {
      const res = await request(baseUrl, 'DELETE', `/api/products/${saleProductId}`, null, adminToken);
      assert.equal(res.status, 409);
      return `409; ${res.payload.message}`;
    });

    await runCase('TC-22', 'DELETE /api/products/:id', 'Admin deletes product without sales history', '200 and deleted id', async () => {
      const create = await request(baseUrl, 'POST', '/api/products', {
        ...saleProduct, sku: 'TEST-DELETE-001', name: 'Temporary Delete Product'
      }, adminToken);
      assert.equal(create.status, 201);
      deletableProductId = Number(create.payload.data.id);
      const res = await request(baseUrl, 'DELETE', `/api/products/${deletableProductId}`, null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(Number(res.payload.data.id), deletableProductId);
      return `200; deleted product id=${deletableProductId}`;
    });

    await runCase('TC-23', 'GET /api/auth/me', 'Retrieve the authenticated administrator profile', '200 and current admin user', async () => {
      const res = await request(baseUrl, 'GET', '/api/auth/me', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.role, 'admin');
      return `200; user=${res.payload.data.email}; role=${res.payload.data.role}`;
    });

    await runCase('TC-24', 'GET /api/orders', 'Retrieve the order register', '200 and created order included', async () => {
      const res = await request(baseUrl, 'GET', '/api/orders', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.some((order) => Number(order.id) === orderId));
      return `200; ${res.payload.data.length} orders returned; created order found`;
    });

    await runCase('TC-25', 'GET /api/customers', 'Retrieve the customer directory', '200 and created customer included', async () => {
      const res = await request(baseUrl, 'GET', '/api/customers', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.some((customer) => customer.email === 'test.customer@example.com'));
      return `200; ${res.payload.data.length} customers returned; created customer found`;
    });

    await runCase('TC-26', 'GET /api/settings', 'Retrieve current store settings', '200 and updated settings returned', async () => {
      const res = await request(baseUrl, 'GET', '/api/settings', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(Number(res.payload.data.default_threshold), 6);
      return `200; store=${res.payload.data.store_name}; threshold=${res.payload.data.default_threshold}`;
    });

    await runCase('TC-27', 'GET /api/database/tables', 'Admin retrieves the read-only database table catalog', '200 and approved table metadata', async () => {
      const res = await request(baseUrl, 'GET', '/api/database/tables', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.read_only, true);
      assert.ok(res.payload.data.tables.some((table) => table.name === 'products'));
      assert.ok(res.payload.data.tables.some((table) => table.name === 'users'));
      return `200; ${res.payload.data.tables.length} approved tables returned`;
    });

    await runCase('TC-28', 'GET /api/database/products', 'Admin searches paginated product rows', '200, matching rows, and pagination metadata', async () => {
      const res = await request(baseUrl, 'GET', '/api/database/products?search=TEST-SALE-001&page=1&page_size=10', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.read_only, true);
      assert.equal(res.payload.data.rows.length, 1);
      assert.equal(res.payload.data.rows[0].sku, 'TEST-SALE-001');
      assert.equal(res.payload.data.pagination.page_size, 10);
      return '200; matching product row returned with pagination';
    });

    await runCase('TC-29', 'GET /api/database/users', 'Database viewer excludes password hashes', '200 without sensitive password_hash field', async () => {
      const res = await request(baseUrl, 'GET', '/api/database/users', null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.rows.length >= 2);
      assert.ok(!res.payload.data.columns.some((column) => column.name === 'password_hash'));
      assert.ok(res.payload.data.rows.every((row) => !Object.prototype.hasOwnProperty.call(row, 'password_hash')));
      return '200; user rows returned without password hashes';
    });

    await runCase('TC-30', 'GET /api/database/tables', 'Employee attempts to open the database viewer', '403 Forbidden', async () => {
      const res = await request(baseUrl, 'GET', '/api/database/tables', null, employeeToken);
      assert.equal(res.status, 403);
      return `403; ${res.payload.message}`;
    });

    await runCase('TC-31', 'POST /api/products/image', 'Employee attempts to upload a product image', '403 Forbidden', async () => {
      const res = await uploadRequest(baseUrl, '/api/products/image', {
        bytes: Buffer.from('not-read-because-permission-fails'), name: 'employee.png', type: 'image/png'
      }, employeeToken);
      assert.equal(res.status, 403);
      return `403; ${res.payload.message}`;
    });

    await runCase('TC-32', 'POST /api/products/image', 'Admin uploads an unsupported file type', '400 validation error', async () => {
      const res = await uploadRequest(baseUrl, '/api/products/image', {
        bytes: Buffer.from('plain text'), name: 'notes.txt', type: 'text/plain'
      }, adminToken);
      assert.equal(res.status, 400);
      assert.match(res.payload.message, /JPG, PNG, and WebP/);
      return `400; ${res.payload.message}`;
    });

    await runCase('TC-33', 'POST /api/products/image', 'Admin uploads a valid local product image', '201, public URL, and persisted file', async () => {
      const pngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
      const res = await uploadRequest(baseUrl, '/api/products/image', {
        bytes: pngBytes, name: 'catalog-image.png', type: 'image/png'
      }, adminToken);
      assert.equal(res.status, 201);
      assert.match(res.payload.data.image_url, /^\/uploads\/products\/[a-f0-9-]+\.png$/);
      const uploadedPath = path.join(process.env.SMARTSTOCK_UPLOAD_DIR, res.payload.data.filename);
      assert.equal(fs.existsSync(uploadedPath), true);
      const publicImage = await fetch(`${baseUrl}${res.payload.data.image_url}`);
      assert.equal(publicImage.status, 200);
      assert.equal(publicImage.headers.get('content-type'), 'image/png');
      return `201; ${res.payload.data.image_url}; file persisted and publicly readable`;
    });

    await runCase('TC-34', 'GET /api/inventory/movements', 'Admin reviews the complete movement history for a product', '200 with initial, edit, and sale movements', async () => {
      const res = await request(baseUrl, 'GET', `/api/inventory/movements?product_id=${saleProductId}`, null, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.rows.some((movement) => movement.movement_type === 'INITIAL' && Number(movement.quantity_after) === 10));
      assert.ok(res.payload.data.rows.some((movement) => movement.movement_type === 'ADJUSTMENT' && Number(movement.quantity_before) === 10 && Number(movement.quantity_after) === 12));
      assert.ok(res.payload.data.rows.some((movement) => movement.movement_type === 'SALE' && Number(movement.quantity_before) === 12 && Number(movement.quantity_after) === 10));
      return `200; ${res.payload.data.rows.length} movements include INITIAL, ADJUSTMENT, and SALE`;
    });

    await runCase('TC-35', 'GET /api/inventory/movements', 'Employee opens the read-only movement history', '200 with movement rows', async () => {
      const res = await request(baseUrl, 'GET', `/api/inventory/movements?product_id=${saleProductId}`, null, employeeToken);
      assert.equal(res.status, 200);
      assert.ok(res.payload.data.rows.length >= 3);
      return `200; employee can read ${res.payload.data.rows.length} movements`;
    });

    await runCase('TC-36', 'POST /api/inventory/adjustments', 'Employee attempts a manual stock adjustment', '403 Forbidden', async () => {
      const res = await request(baseUrl, 'POST', '/api/inventory/adjustments', {
        product_id: saleProductId, quantity_change: 5, reason: 'Unauthorized adjustment attempt'
      }, employeeToken);
      assert.equal(res.status, 403);
      return `403; ${res.payload.message}`;
    });

    await runCase('TC-37', 'POST /api/inventory/adjustments', 'Admin adds stock with a documented reason', '201, movement created, and stock increased', async () => {
      const res = await request(baseUrl, 'POST', '/api/inventory/adjustments', {
        product_id: saleProductId, quantity_change: 5, reason: 'Cycle count delivery received'
      }, adminToken);
      assert.equal(res.status, 201);
      assert.equal(Number(res.payload.data.product.quantity), 15);
      assert.equal(Number(res.payload.data.movement.quantity_before), 10);
      assert.equal(Number(res.payload.data.movement.quantity_after), 15);
      return '201; stock 10 → 15; positive adjustment recorded';
    });

    await runCase('TC-38', 'POST /api/inventory/adjustments', 'Admin removes stock with a documented reason', '201, movement created, and stock reduced', async () => {
      const res = await request(baseUrl, 'POST', '/api/inventory/adjustments', {
        product_id: saleProductId, quantity_change: -2, reason: 'Cycle count damaged units'
      }, adminToken);
      assert.equal(res.status, 201);
      assert.equal(Number(res.payload.data.product.quantity), 13);
      assert.equal(Number(res.payload.data.movement.quantity_change), -2);
      return '201; stock 15 → 13; negative adjustment recorded';
    });

    await runCase('TC-39', 'POST /api/inventory/adjustments', 'Admin attempts to reduce inventory below zero', '400 and stock remains unchanged', async () => {
      const res = await request(baseUrl, 'POST', '/api/inventory/adjustments', {
        product_id: saleProductId, quantity_change: -999, reason: 'Invalid negative balance test'
      }, adminToken);
      assert.equal(res.status, 400);
      const productRes = await request(baseUrl, 'GET', '/api/products?search=TEST-SALE-001', null, adminToken);
      assert.equal(Number(productRes.payload.data[0].quantity), 13);
      return `400; ${res.payload.message}; stock remains 13`;
    });

    await runCase('TC-40', 'GET /api/inventory/movements', 'Filter and paginate movement history by type and reason', '200 with matching adjustment rows and pagination', async () => {
      const res = await request(baseUrl, 'GET', '/api/inventory/movements?type=ADJUSTMENT&search=Cycle%20count&page=1&page_size=10', null, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.payload.data.pagination.page_size, 10);
      assert.ok(res.payload.data.rows.length >= 2);
      assert.ok(res.payload.data.rows.every((movement) => movement.movement_type === 'ADJUSTMENT' && movement.reason.includes('Cycle count')));
      return `200; ${res.payload.data.rows.length} filtered adjustment rows returned`;
    });

    await runCase('TC-41', 'POST /api/auth/logout', 'Admin logs out', '200 and session invalidated', async () => {
      const res = await request(baseUrl, 'POST', '/api/auth/logout', null, adminToken);
      assert.equal(res.status, 200);
      const me = await request(baseUrl, 'GET', '/api/auth/me', null, adminToken);
      assert.equal(me.status, 401);
      return '200 logout; former session returns 401';
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const passed = results.filter((item) => item.status === 'Pass').length;
  const failed = results.length - passed;
  const report = {
    project: 'SmartStock Inventory and Sales Management System',
    executed_at: new Date().toISOString(),
    environment: { runtime: process.version, database: 'Isolated temporary SQLite database', transport: 'HTTP on an ephemeral local port' },
    summary: { total: results.length, passed, failed, pass_rate: `${((passed / results.length) * 100).toFixed(1)}%` },
    results
  };

  const reportPath = process.env.SMARTSTOCK_TEST_REPORT
    ? path.resolve(process.env.SMARTSTOCK_TEST_REPORT)
    : path.join(__dirname, 'api-test-results.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`SmartStock API tests: ${passed}/${results.length} passed`);
  console.log(`Report: ${reportPath}`);
  results.forEach((item) => console.log(`${item.status === 'Pass' ? 'PASS' : 'FAIL'} ${item.id} ${item.scenario}`));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
