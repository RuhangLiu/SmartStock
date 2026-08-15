const { db } = require('./db');

function recordInventoryMovement({
  product,
  movementType,
  quantityChange,
  quantityBefore,
  quantityAfter,
  reason,
  referenceType = null,
  referenceId = null,
  user = null
}) {
  const info = db.prepare(`
    INSERT INTO inventory_movements (
      product_id, product_sku, product_name, movement_type, quantity_change,
      quantity_before, quantity_after, reason, reference_type, reference_id,
      created_by, created_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    product.id,
    product.sku,
    product.name,
    movementType,
    quantityChange,
    quantityBefore,
    quantityAfter,
    reason,
    referenceType,
    referenceId,
    user?.id || null,
    user?.name || 'System'
  );

  return db.prepare('SELECT * FROM inventory_movements WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = { recordInventoryMovement };
