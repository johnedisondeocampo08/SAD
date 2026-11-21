function ownerFor(record, currentOwnerId) {
  return record.createdByOwnerId || currentOwnerId;
}

function timestampValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('A record contains an invalid date and could not be saved.');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function persistWorkspace(connection, state, previous, currentOwnerId) {
  await connection.query("SET time_zone = '+00:00'");
  const materialIds = new Map(state.materials.map((material) => [material.name, material.id]));
  const orderItemIds = new Set(state.orders.flatMap((order) => order.items.map((item) => item.id)));

  for (const customer of state.customers) {
    await connection.query(
      `INSERT INTO customer
        (customer_id, full_name, contact_number, email, address, notes, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name), contact_number = VALUES(contact_number),
        email = VALUES(email), address = VALUES(address), notes = VALUES(notes)`,
      [customer.id, customer.name, customer.phone || null, customer.email || null, customer.address || null, customer.notes || null, ownerFor(customer, currentOwnerId)]
    );
  }

  for (const product of state.products) {
    await connection.query(
      `INSERT INTO product_variant
        (variant_id, variant_name, description, base_price, product_type, active, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        variant_name = VALUES(variant_name), description = VALUES(description),
        base_price = VALUES(base_price), product_type = VALUES(product_type),
        active = VALUES(active)`,
      [product.id, product.name, product.description || null, Number(product.price), product.type, product.active !== false, ownerFor(product, currentOwnerId)]
    );
  }

  for (const material of state.materials) {
    await connection.query(
      `INSERT INTO material
        (material_id, material_name, unit, stock_qty, unit_price, low_stock_threshold, active, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        material_name = VALUES(material_name), unit = VALUES(unit),
        stock_qty = VALUES(stock_qty), unit_price = VALUES(unit_price),
        low_stock_threshold = VALUES(low_stock_threshold), active = VALUES(active)`,
      [material.id, material.name, material.unit, Number(material.stock), Number(material.price), Number(material.threshold), material.active !== false, ownerFor(material, currentOwnerId)]
    );
  }

  for (const product of state.products) {
    await connection.query('DELETE FROM variant_material_recipe WHERE variant_id = ?', [product.id]);
    for (const use of product.recipe || []) {
      const materialId = materialIds.get(use.material);
      if (!materialId) throw new Error(`Recipe material ${use.material} does not exist in the inventory.`);
      await connection.query(
        'INSERT INTO variant_material_recipe (variant_id, material_id, qty_per_item) VALUES (?, ?, ?)',
        [product.id, materialId, Number(use.quantity)]
      );
    }
  }

  for (const order of state.orders) {
    const paid = state.payments.filter((payment) => payment.orderId === order.id).reduce((sum, payment) => sum + Number(payment.amount), 0);
    const paymentStatus = paid >= Number(order.total) ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    await connection.query(
      `INSERT INTO customer_order
        (order_id, customer_id, order_date, due_date, status, payment_status,
         total_amount, shipping_fee, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        customer_id = VALUES(customer_id), order_date = VALUES(order_date),
        due_date = VALUES(due_date), status = VALUES(status),
        payment_status = VALUES(payment_status), total_amount = VALUES(total_amount),
        shipping_fee = VALUES(shipping_fee)`,
      [order.id, order.customerId, order.date, order.dueDate || null, order.status.toLowerCase(), paymentStatus, Number(order.total), Number(order.shipping || 0), ownerFor(order, currentOwnerId)]
    );
    for (const item of order.items) {
      await connection.query(
        `INSERT INTO order_item
          (item_id, order_id, variant_id, quantity, unit_price, active, created_by_owner_id)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE
          order_id = VALUES(order_id), variant_id = VALUES(variant_id),
          quantity = VALUES(quantity), unit_price = VALUES(unit_price), active = TRUE`,
        [item.id, order.id, item.productId, Number(item.quantity), Number(item.price), ownerFor(order, currentOwnerId)]
      );
    }
  }

  const currentOrderIds = new Set(state.orders.map((order) => order.id));
  for (const oldOrder of previous.orders || []) {
    if (!currentOrderIds.has(oldOrder.id)) continue;
    for (const oldItem of oldOrder.items || []) {
      if (!orderItemIds.has(oldItem.id)) {
        await connection.query('UPDATE order_item SET active = FALSE WHERE item_id = ?', [oldItem.id]);
      }
    }
  }

  for (const payment of state.payments) {
    await connection.query(
      `INSERT INTO payment
        (payment_id, order_id, amount, payment_method, paid_at, reference_no, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        order_id = VALUES(order_id), amount = VALUES(amount),
        payment_method = VALUES(payment_method), paid_at = VALUES(paid_at),
        reference_no = VALUES(reference_no)`,
      [payment.id, payment.orderId, Number(payment.amount), payment.method, timestampValue(payment.paidAt), payment.reference || null, ownerFor(payment, currentOwnerId)]
    );
  }

  for (const expense of state.expenses) {
    await connection.query(
      `INSERT INTO expense
        (expense_id, category, description, amount, expense_date, payment_method, receipt_url, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        category = VALUES(category), description = VALUES(description),
        amount = VALUES(amount), expense_date = VALUES(expense_date),
        payment_method = VALUES(payment_method), receipt_url = VALUES(receipt_url)`,
      [expense.id, expense.category, expense.description || null, Number(expense.amount), expense.date, expense.method || null, expense.receipt || null, ownerFor(expense, currentOwnerId)]
    );
  }

  for (const batch of state.batches) {
    await connection.query(
      `INSERT INTO production_batch
        (batch_id, item_id, quantity_produced, produced_at, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        item_id = VALUES(item_id), quantity_produced = VALUES(quantity_produced),
        produced_at = VALUES(produced_at)`,
      [batch.id, batch.itemId, Number(batch.quantity), timestampValue(batch.date), ownerFor(batch, currentOwnerId)]
    );
    const batchPrefix = `Production ${batch.id} `;
    const batchMovements = state.movements.filter((movement) => movement.reason?.startsWith(batchPrefix) && Number(movement.change) < 0);
    if (!batchMovements.length) throw new Error(`Production batch ${batch.id} has no recorded material deductions.`);
    for (const movement of batchMovements) {
      const materialId = movement.materialId || materialIds.get(movement.material) || (previous.materials || []).find((material) => material.name === movement.material)?.id;
      if (!materialId) throw new Error(`Production batch ${batch.id} refers to an unknown material.`);
      await connection.query(
        `INSERT INTO batch_material_usage (usage_id, batch_id, material_id, qty_used)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE material_id = VALUES(material_id), qty_used = VALUES(qty_used)`,
        [movement.id, batch.id, materialId, Math.abs(Number(movement.change))]
      );
    }
  }

  for (const movement of state.movements) {
    const materialId = movement.materialId || materialIds.get(movement.material) || (previous.materials || []).find((material) => material.name === movement.material)?.id;
    if (!materialId) throw new Error(`Inventory movement ${movement.id} refers to an unknown material.`);
    const batchId = state.batches.find((batch) => movement.reason?.startsWith(`Production ${batch.id} `))?.id || null;
    const movementType = movement.movementType || (batchId ? 'production' : Number(movement.change) > 0 ? 'restock' : 'adjustment');
    await connection.query(
      `INSERT INTO inventory_movement
        (movement_id, material_id, batch_id, movement_type, quantity_change, reason, created_at, created_by_owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        material_id = VALUES(material_id), batch_id = VALUES(batch_id),
        movement_type = VALUES(movement_type), quantity_change = VALUES(quantity_change),
        reason = VALUES(reason), created_at = VALUES(created_at)`,
      [movement.id, materialId, batchId, movementType, Number(movement.change), movement.reason || null, timestampValue(movement.createdAt), ownerFor(movement, currentOwnerId)]
    );
  }
}

module.exports = persistWorkspace;
