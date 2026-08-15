const { db } = require('../models/db');

const TABLES = {
  products: {
    columns: ['id', 'sku', 'name', 'origin', 'material', 'dye_technique', 'category', 'price', 'cost', 'quantity', 'low_stock_threshold', 'image_url', 'created_at', 'updated_at']
  },
  sales: {
    columns: ['id', 'product_id', 'quantity_sold', 'total_price', 'sale_date', 'destination_region', 'sales_channel']
  },
  orders: {
    columns: ['id', 'supplier', 'product_name', 'quantity', 'status', 'destination_region', 'order_type', 'created_at']
  },
  customers: {
    columns: ['id', 'name', 'email', 'phone', 'region', 'total_purchases']
  },
  users: {
    columns: ['id', 'name', 'email', 'role', 'created_at']
  },
  sessions: {
    columns: ['user_id', 'expires_at']
  },
  settings: {
    columns: ['id', 'store_name', 'store_email', 'default_threshold', 'admin_name', 'currency']
  },
  inventory_movements: {
    columns: [
      'id', 'product_id', 'product_sku', 'product_name', 'movement_type', 'quantity_change',
      'quantity_before', 'quantity_after', 'reason', 'reference_type', 'reference_id',
      'created_by', 'created_by_name', 'created_at'
    ]
  }
};

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function getTableDefinition(tableName) {
  return Object.prototype.hasOwnProperty.call(TABLES, tableName) ? TABLES[tableName] : null;
}

function getColumnMetadata(tableName, allowedColumns) {
  const schemaColumns = db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all();
  const schemaByName = new Map(schemaColumns.map((column) => [column.name, column]));
  return allowedColumns
    .filter((name) => schemaByName.has(name))
    .map((name) => ({ name, type: schemaByName.get(name).type || 'TEXT' }));
}

exports.listTables = (req, res) => {
  const tables = Object.entries(TABLES).map(([name, definition]) => ({
    name,
    row_count: Number(db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(name)}`).get().count),
    column_count: getColumnMetadata(name, definition.columns).length
  }));
  res.json({ success: true, data: { tables, read_only: true } });
};

exports.getTableRows = (req, res) => {
  const tableName = String(req.params.table || '').trim().toLowerCase();
  const definition = getTableDefinition(tableName);
  if (!definition) return res.status(404).json({ success: false, message: 'Database table not available' });

  const columns = getColumnMetadata(tableName, definition.columns);
  const columnNames = columns.map((column) => column.name);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(req.query.page_size, 10) || 25));
  const search = String(req.query.search || '').trim().slice(0, 100);
  const tableSql = quoteIdentifier(tableName);
  const selectedColumns = columnNames.map(quoteIdentifier).join(', ');
  const searchSql = search
    ? ` WHERE ${columnNames.map((column) => `CAST(${quoteIdentifier(column)} AS TEXT) LIKE ?`).join(' OR ')}`
    : '';
  const searchParams = search ? columnNames.map(() => `%${search}%`) : [];
  const total = Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableSql}${searchSql}`).get(...searchParams).count);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const rows = db.prepare(`
    SELECT ${selectedColumns}
    FROM ${tableSql}${searchSql}
    ORDER BY rowid DESC
    LIMIT ? OFFSET ?
  `).all(...searchParams, pageSize, offset);

  res.json({
    success: true,
    data: {
      table: tableName,
      columns,
      rows,
      read_only: true,
      pagination: { page: safePage, page_size: pageSize, total, total_pages: totalPages }
    }
  });
};
