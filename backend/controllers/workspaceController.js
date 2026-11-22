const db = require('../config/db');
const persistWorkspace = require('../services/persistWorkspace');

const STATE_COLLECTIONS = ['customers', 'products', 'materials', 'orders', 'payments', 'expenses', 'batches', 'movements'];
const AUTHOR_COLLECTIONS = ['customers', 'products', 'materials', 'orders', 'payments', 'expenses', 'batches', 'movements'];

function hasValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function hasValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidWorkspace(state, previous = null) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  if (state.expenseBookMonth !== undefined && !hasValidMonth(state.expenseBookMonth)) return false;
  if (STATE_COLLECTIONS.some((collection) => !Array.isArray(state[collection]))) return false;
  for (const collection of STATE_COLLECTIONS) {
    const records = state[collection];
    if (records.some((record) => !record || typeof record.id !== 'string' || !record.id) || new Set(records.map((record) => record.id)).size !== records.length) return false;
  }
  if (state.customers.some((customer) => typeof customer.name !== 'string' || !customer.name.trim() || customer.name.length > 150)) return false;
  if (state.products.some((product) => typeof product.name !== 'string' || !product.name.trim() || !['Candle', 'Souvenir'].includes(product.type) || !Number.isFinite(Number(product.price)) || Number(product.price) < 0)) return false;
  if (state.materials.some((material) => typeof material.name !== 'string' || !material.name.trim())) return false;
  if (state.materials.some((material) => typeof material.unit !== 'string' || !material.unit.trim() || !Number.isFinite(Number(material.price)) || Number(material.price) < 0)) return false;
  if (state.orders.some((order) => !Array.isArray(order.items) || order.items.some((item) => !item || typeof item !== 'object'))) return false;
  const customerIds = new Set(state.customers.map((customer) => customer.id));
  const productIds = new Set(state.products.map((product) => product.id));
  const productsById = new Map(state.products.map((product) => [product.id, product]));
  const materialNames = new Set(state.materials.map((material) => material.name.toLowerCase()));
  const orderItemIds = state.orders.flatMap((order) => order.items.map((item) => item.id));
  if (new Set(orderItemIds).size !== orderItemIds.length || orderItemIds.some((id) => typeof id !== 'string' || !id)) return false;
  if (materialNames.size !== state.materials.length) return false;
  if (state.products.some((product) => !Array.isArray(product.recipe) || product.recipe.some((use) => {
    if (!use || typeof use.material !== 'string') return true;
    const materialExists = state.materials.some((material) => material.name === use.material);
    return !materialExists || !Number.isFinite(Number(use.quantity)) || Number(use.quantity) <= 0;
  }))) return false;
  if (state.materials.some((material) => !Number.isFinite(Number(material.stock)) || Number(material.stock) < 0 || !Number.isFinite(Number(material.threshold)) || Number(material.threshold) < 0)) return false;
  if (state.orders.some((order) => {
    if (!customerIds.has(order.customerId) || !hasValidDate(order.date) || (order.dueDate && (!hasValidDate(order.dueDate) || order.dueDate < order.date)) || !['Pending', 'In production', 'Ready', 'Paid', 'Delivered', 'Cancelled'].includes(order.status) || (order.stockReserved !== undefined && typeof order.stockReserved !== 'boolean') || !Array.isArray(order.items) || !order.items.length || !Number.isFinite(Number(order.shipping || 0)) || Number(order.shipping || 0) < 0 || !Number.isFinite(Number(order.total)) || Number(order.total) < 0) return true;
    if (order.items.some((item) => !productIds.has(item.productId) || item.type !== productsById.get(item.productId)?.type || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || !['Candle', 'Souvenir'].includes(item.type))) return true;
    const itemTotal = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    return Math.abs(Number(order.total) - itemTotal - Number(order.shipping || 0)) > 0.01;
  })) return false;
  if (state.payments.some((payment) => !Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0 || !['Cash', 'GCash'].includes(payment.method) || !hasValidDate(payment.paidAt))) return false;
  if (state.expenses.some((expense) => !Number.isFinite(Number(expense.amount)) || Number(expense.amount) <= 0 || typeof expense.category !== 'string' || !expense.category || !hasValidDate(expense.date) || (expense.installmentMonths != null && (!Number.isInteger(Number(expense.installmentMonths)) || Number(expense.installmentMonths) < 1)) || (expense.startMonth !== undefined && !hasValidMonth(expense.startMonth)) || (expense.paidMonths !== undefined && (!Array.isArray(expense.paidMonths) || expense.paidMonths.some((paidMonth) => !hasValidMonth(paidMonth)) || new Set(expense.paidMonths).size !== expense.paidMonths.length)))) return false;
  if (state.batches.some((batch) => !Number.isInteger(Number(batch.quantity)) || Number(batch.quantity) < 1 || !hasValidDate(batch.date))) return false;
  if (state.movements.some((movement) => !Number.isFinite(Number(movement.change)) || Number(movement.change) === 0 || typeof movement.material !== 'string' || !movement.material || !hasValidDate(movement.createdAt) || (movement.movementType && !['restock', 'adjustment', 'production'].includes(movement.movementType)))) return false;

  const paymentCounts = new Map();
  const paymentTotals = new Map();
  for (const payment of state.payments) {
    paymentCounts.set(payment.orderId, (paymentCounts.get(payment.orderId) || 0) + 1);
    paymentTotals.set(payment.orderId, (paymentTotals.get(payment.orderId) || 0) + Number(payment.amount));
  }
  const orders = new Map(state.orders.map((order) => [order.id, order]));
  for (const [orderId, count] of paymentCounts) {
    const order = orders.get(orderId);
    if (!order || count > 2 || paymentTotals.get(orderId) > Number(order.total) + 0.001) return false;
  }
  if (previous) {
    const previousOrders = new Map((previous.orders || []).map((order) => [order.id, order]));
    const previousPayments = new Set((previous.payments || []).map((payment) => payment.id));
    const newPayments = state.payments.filter((payment) => !previousPayments.has(payment.id));
    const newPaymentOrderIds = new Set(newPayments.map((payment) => payment.orderId));
    for (const orderId of newPaymentOrderIds) {
      const oldPayments = (previous.payments || []).filter((payment) => payment.orderId === orderId);
      if (oldPayments.length !== 1) continue;
      const addedPayments = newPayments.filter((payment) => payment.orderId === orderId);
      const order = orders.get(orderId);
      const oldPaid = oldPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const remaining = Number(order.total) - oldPaid;
      if (addedPayments.length !== 1 || Math.abs(Number(addedPayments[0].amount) - remaining) > 0.001) return false;
    }
    for (const order of state.orders) {
      const oldOrder = previousOrders.get(order.id);
      const paid = paymentTotals.get(order.id) || 0;
      const fullyPaid = paid >= Number(order.total);
      if (oldOrder?.stockReserved && !order.stockReserved) return false;
      if (newPaymentOrderIds.has(order.id) && !oldOrder?.stockReserved && !order.stockReserved) return false;
      if (order.stockReserved && !oldOrder?.stockReserved && !newPaymentOrderIds.has(order.id) && !fullyPaid) return false;
      if (order.status === 'Cancelled') {
        const previouslyPaid = oldOrder && (previous.payments || [])
          .filter((payment) => payment.orderId === order.id)
          .reduce((sum, payment) => sum + Number(payment.amount), 0) >= Number(oldOrder.total);
        if (!oldOrder && paid > 0) return false;
        if (oldOrder && oldOrder.status !== 'Cancelled' && (oldOrder.status === 'Delivered' || previouslyPaid)) return false;
      } else if (order.status === 'Delivered') {
        if ((!oldOrder || !['In production', 'Delivered'].includes(oldOrder.status)) || !fullyPaid || (oldOrder.status !== 'Delivered' && !order.stockReserved)) return false;
      } else {
        if (['Cancelled', 'Delivered'].includes(oldOrder?.status)) return false;
        if (order.status !== (fullyPaid ? 'In production' : 'Pending')) return false;
      }
    }
    for (const payment of state.payments) {
      if (orders.get(payment.orderId)?.status === 'Cancelled' && !previousPayments.has(payment.id)) return false;
    }
  }

  const previousBatches = previous?.batches || [];
  const batchIds = new Set(state.batches.map((batch) => batch.id));
  if (previous && previousBatches.some((batch) => !batchIds.has(batch.id))) return false;
  const previousBatchesById = new Map(previousBatches.map((batch) => [batch.id, batch]));
  for (const batch of state.batches) {
    const oldBatch = previousBatchesById.get(batch.id);
    if (oldBatch && ['orderId', 'itemId', 'productId', 'quantity', 'date', 'product'].some((key) => oldBatch[key] !== batch[key])) return false;
  }
  const previousMovements = previous?.movements || [];
  const movementsById = new Map(state.movements.map((movement) => [movement.id, movement]));
  for (const oldMovement of previousMovements) {
    const movement = movementsById.get(oldMovement.id);
    if (!movement || oldMovement.material !== movement.material || Number(oldMovement.change) !== Number(movement.change) || oldMovement.movementType !== movement.movementType || oldMovement.reason !== movement.reason || oldMovement.createdAt !== movement.createdAt) return false;
  }
  if (state.movements.some((movement) => movement.movementType === 'production' && (Number(movement.change) >= 0 || !state.batches.some((batch) => movement.reason?.startsWith(`Production ${batch.id} `))))) return false;

  const producedByItem = new Map();
  for (const batch of state.batches) {
    if (batch.productId) {
      if (!productIds.has(batch.productId) || batch.itemId || batch.orderId) return false;
      continue;
    }
    const order = state.orders.find((entry) => entry.id === batch.orderId);
    const item = order?.items.find((entry) => entry.id === batch.itemId);
    if (!order || !item || !state.products.some((product) => product.id === item.productId)) return false;
    if (previousBatchesById.has(batch.id)) {
      const oldOrder = (previous.orders || []).find((entry) => entry.id === batch.orderId);
      const oldItem = oldOrder?.items.find((entry) => entry.id === batch.itemId);
      if (!oldItem || oldItem.productId !== item.productId) return false;
    }
    producedByItem.set(item.id, (producedByItem.get(item.id) || 0) + Number(batch.quantity));
    if (producedByItem.get(item.id) > Number(item.quantity)) return false;
  }

  const oldBatchIds = new Set(previous ? previousBatches.map((batch) => batch.id) : state.batches.map((batch) => batch.id));
  const newBatches = state.batches.filter((batch) => !oldBatchIds.has(batch.id));
  for (const batch of newBatches) {
    const order = batch.itemId ? state.orders.find((entry) => entry.id === batch.orderId) : null;
    const item = order?.items.find((entry) => entry.id === batch.itemId);
    const product = batch.productId
      ? state.products.find((entry) => entry.id === batch.productId)
      : state.products.find((entry) => entry.id === item?.productId);
    if (!product || !Array.isArray(product.recipe) || !product.recipe.length) return false;
    if (batch.itemId) {
      if (!order || !item) return false;
      const alreadyProduced = state.batches.filter((entry) => entry.itemId === item.id && entry.id !== batch.id).reduce((sum, entry) => sum + Number(entry.quantity), 0);
      if (alreadyProduced + Number(batch.quantity) > Number(item.quantity)) return false;
    } else if (!batch.productId) {
      return false;
    }

    const expected = new Map();
    for (const use of product.recipe) {
      const material = state.materials.find((entry) => entry.name === use.material && entry.active);
      const usedPerItem = Number(use.quantity);
      if (!material || !Number.isFinite(usedPerItem) || usedPerItem <= 0) return false;
      expected.set(material.name, (expected.get(material.name) || 0) + usedPerItem * Number(batch.quantity));
    }

    const batchPrefix = `Production ${batch.id} `;
    const actual = new Map();
    for (const movement of state.movements) {
      if (movement.reason?.startsWith(batchPrefix)) {
        if (movement.movementType && movement.movementType !== 'production') return false;
        actual.set(movement.material, (actual.get(movement.material) || 0) - Number(movement.change));
      }
    }
    if (expected.size !== actual.size) return false;
    for (const [material, quantity] of expected) {
      if (Math.abs(quantity - (actual.get(material) || 0)) > 0.0005) return false;
    }
  }

  const finishedStock = new Map();
  for (const batch of state.batches.filter((entry) => entry.productId)) {
    finishedStock.set(batch.productId, (finishedStock.get(batch.productId) || 0) + Number(batch.quantity));
  }
  const reservedStock = new Map();
  for (const order of state.orders.filter((entry) => entry.stockReserved)) {
    if (!(paymentCounts.get(order.id) > 0)) return false;
    for (const item of order.items) {
      reservedStock.set(item.productId, (reservedStock.get(item.productId) || 0) + Number(item.quantity));
    }
  }
  for (const [productId, reserved] of reservedStock) {
    if (reserved > (finishedStock.get(productId) || 0)) return false;
  }

  const previousMaterials = new Map((previous?.materials || []).map((material) => [material.id, material]));
  const previousMovementIds = new Set(previousMovements.map((movement) => movement.id));
  const addedMovements = state.movements.filter((movement) => !previousMovementIds.has(movement.id));
  for (const material of state.materials) {
    const oldMaterial = previousMaterials.get(material.id);
    if (!oldMaterial) continue;
    const movementTotal = addedMovements.filter((movement) => movement.materialId === material.id || (!movement.materialId && movement.material === material.name)).reduce((sum, movement) => sum + Number(movement.change), 0);
    if (Math.abs((Number(material.stock) - Number(oldMaterial.stock)) - movementTotal) > 0.0005) return false;
  }
  return true;
}

function addAuthors(state, previous, owner) {
  for (const collection of AUTHOR_COLLECTIONS) {
    const oldIds = new Set((previous[collection] || []).map((item) => item.id));
    state[collection] = state[collection].map((item) => oldIds.has(item.id) ? item : {
      ...item,
      createdBy: owner.display_name,
      createdByOwnerId: owner.owner_id
    });
  }
  return state;
}

async function getWorkspace(request, response) {
  try {
    const [rows] = await db.query('SELECT state_json, version, updated_at FROM workspace_state WHERE state_id = 1');
    response.json({ success: true, data: rows[0]?.state_json || null, version: Number(rows[0]?.version || 0), updatedAt: rows[0]?.updated_at || null });
  } catch (error) {
    console.error('Workspace retrieval error:', error);
    response.status(500).json({ success: false, message: 'Unable to load saved studio records.' });
  }
}

async function saveWorkspace(request, response) {
  const state = request.body?.data;
  const expectedVersion = Number(request.body?.version);
  if (!isValidWorkspace(state) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return response.status(400).json({ success: false, message: 'Studio records did not pass validation. No changes were saved.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'INSERT IGNORE INTO workspace_state (state_id, state_json) VALUES (1, JSON_OBJECT())'
    );
    const [rows] = await connection.query(
      'SELECT state_json, version FROM workspace_state WHERE state_id = 1 FOR UPDATE'
    );
    const currentVersion = Number(rows[0]?.version || 0);
    if (expectedVersion !== currentVersion) {
      await connection.rollback();
      return response.status(409).json({ success: false, message: 'Another owner saved newer studio records. Reload the workspace to avoid overwriting their changes.' });
    }
    const previous = rows[0]?.state_json || {};
    if (!isValidWorkspace(state, previous)) {
      await connection.rollback();
      return response.status(400).json({ success: false, message: 'Studio records failed inventory or production validation. No changes were saved.' });
    }
    const authoredState = addAuthors(state, previous, request.owner);
    await persistWorkspace(connection, authoredState, previous, request.owner.owner_id);
    await connection.query(
      `UPDATE workspace_state SET state_json = CAST(? AS JSON), version = version + 1
       WHERE state_id = 1`,
      [JSON.stringify(authoredState)]
    );
    await connection.commit();
    response.json({ success: true, version: currentVersion + 1, savedAt: new Date().toISOString() });
  } catch (error) {
    await connection.rollback();
    console.error('Workspace save error:', error);
    response.status(500).json({ success: false, message: 'Unable to save studio records. Your existing records are unchanged.' });
  } finally {
    connection.release();
  }
}

module.exports = { getWorkspace, saveWorkspace, isValidWorkspace };
