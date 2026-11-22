const crypto = require('node:crypto');
const db = require('../config/db');
const persistWorkspace = require('../services/persistWorkspace');
const { isValidWorkspace } = require('./workspaceController');

function normalizeText(value, maxLength, field, required = false) {
  if (typeof value !== 'string') return { error: `${field} must be text.` };
  const normalized = value.trim();
  if (required && !normalized) return { error: `${field} is required.` };
  if (normalized.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer.` };
  return { value: normalized };
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseWorkspace(value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

function parseItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return JSON.parse(value);
  return [];
}

function nextId(prefix, records) {
  const ids = new Set(records.map((record) => record.id));
  let number = records.length + 1;
  let id = `${prefix}-${String(number).padStart(3, '0')}`;
  while (ids.has(id)) {
    number += 1;
    id = `${prefix}-${String(number).padStart(3, '0')}`;
  }
  return id;
}

function dateOnly(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

async function createBookingRequest(request, response) {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ success: false, message: 'A JSON booking request is required.' });
  }

  const fields = {
    submissionId: normalizeText(body.submissionId, 190, 'Submission ID', true),
    customerName: normalizeText(body.customerName, 150, 'Customer name', true),
    phoneNumber: normalizeText(body.phoneNumber, 20, 'Phone number', true),
    email: normalizeText(body.email || '', 150, 'Email address'),
    productName: normalizeText(body.productName || '', 150, 'Product name'),
    requestedDate: body.requestedDate,
    notes: normalizeText(body.notes || '', 2000, 'Booking notes'),
    deliveryAddress: normalizeText(body.deliveryAddress || '', 1000, 'Delivery address')
  };
  const invalidField = Object.values(fields).find((field) => field?.error);
  if (invalidField) {
    return response.status(400).json({ success: false, message: invalidField.error });
  }

  if (!isValidDate(fields.requestedDate)) {
    return response.status(400).json({ success: false, message: 'Requested date must be a valid date in YYYY-MM-DD format.' });
  }
  if (fields.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value)) {
    return response.status(400).json({ success: false, message: 'Email address is invalid.' });
  }
  if (!/^[+()\d\s-]{7,20}$/.test(fields.phoneNumber.value)) {
    return response.status(400).json({ success: false, message: 'Phone number must contain 7 to 20 digits or phone punctuation.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [workspaceRows] = await connection.query(
      'SELECT state_json FROM workspace_state WHERE state_id = 1 FOR UPDATE'
    );
    if (!workspaceRows.length) {
      await connection.rollback();
      return response.status(503).json({ success: false, message: 'The studio product list is not initialized yet.' });
    }

    const workspace = parseWorkspace(workspaceRows[0].state_json);
    const products = Array.isArray(workspace.products) ? workspace.products : [];
    const requestedItems = Array.isArray(body.items) && body.items.length
      ? body.items
      : [{ productName: fields.productName.value, quantity: body.quantity }];
    if (requestedItems.length > 5) {
      await connection.rollback();
      return response.status(400).json({ success: false, message: 'A booking can include at most five products.' });
    }
    const normalizedItems = [];
    for (const [index, item] of requestedItems.entries()) {
      const productName = normalizeText(item?.productName, 150, `Product ${index + 1}`, true);
      const itemQuantity = Number(item?.quantity);
      if (productName.error || !Number.isSafeInteger(itemQuantity) || itemQuantity < 1 || itemQuantity > 10000) {
        await connection.rollback();
        return response.status(400).json({
          success: false,
          message: productName.error || `Quantity ${index + 1} must be a whole number between 1 and 10000.`
        });
      }
      const product = products.find((entry) => (
        typeof entry.name === 'string'
        && entry.name.trim().toLowerCase() === productName.value.toLowerCase()
        && entry.active !== false
      ));
      if (!product) {
        await connection.rollback();
        return response.status(400).json({ success: false, message: `Product "${productName.value}" was not found in the active studio product list.` });
      }
      normalizedItems.push({ productId: product.id, productName: product.name, quantity: itemQuantity });
    }
    if (!normalizedItems.length) {
      await connection.rollback();
      return response.status(400).json({ success: false, message: 'Choose at least one product to book.' });
    }

    const normalized = {
      submissionId: fields.submissionId.value,
      customerName: fields.customerName.value,
      phoneNumber: fields.phoneNumber.value,
      email: fields.email.value,
      items: normalizedItems,
      requestedDate: fields.requestedDate,
      notes: fields.notes.value,
      deliveryAddress: fields.deliveryAddress.value
    };
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

    const [existingRows] = await connection.query(
      `SELECT request_id, payload_hash, status
       FROM booking_request
       WHERE submission_id = ?
       LIMIT 1`,
      [normalized.submissionId]
    );
    if (existingRows.length) {
      await connection.rollback();
      const existing = existingRows[0];
      if (existing.payload_hash !== payloadHash) {
        return response.status(409).json({ success: false, message: 'This submission ID was already used for different booking details.' });
      }
      return response.status(200).json({
        success: true,
        duplicate: true,
        requestId: existing.request_id,
        status: existing.status
      });
    }

    const requestId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO booking_request
        (request_id, submission_id, payload_hash, customer_name, phone_number,
         email, product_id, product_name, quantity, items_json, requested_date,
         notes, delivery_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        normalized.submissionId,
        payloadHash,
        normalized.customerName,
        normalized.phoneNumber,
        normalized.email || null,
        normalized.items[0].productId,
        normalized.items[0].productName,
        normalized.items[0].quantity,
        JSON.stringify(normalized.items),
        normalized.requestedDate,
        normalized.notes || null,
        normalized.deliveryAddress || null
      ]
    );
    await connection.commit();
    return response.status(201).json({ success: true, duplicate: false, requestId, status: 'Pending' });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ success: false, message: 'This form submission has already been received.' });
    }
    console.error('Booking request intake error:', error);
    return response.status(500).json({ success: false, message: 'Unable to save the booking request. Please retry later.' });
  } finally {
    connection?.release();
  }
}

async function listBookingRequests(request, response) {
  try {
    const [rows] = await db.query(
      `SELECT request_id AS requestId, customer_name AS customerName,
              phone_number AS phoneNumber, email, product_id AS productId,
              product_name AS productName, quantity,
              items_json AS itemsJson,
              DATE_FORMAT(requested_date, '%Y-%m-%d') AS requestedDate,
              notes, delivery_address AS deliveryAddress, status,
              accepted_order_id AS acceptedOrderId, created_at AS createdAt
       FROM booking_request
       ORDER BY created_at DESC`
    );
    const data = rows.map((row) => {
      let items = parseItems(row.itemsJson);
      if (!items.length) {
        items = [{ productId: row.productId, productName: row.productName, quantity: row.quantity }];
      }
      return { ...row, items, itemsJson: undefined };
    });
    return response.json({ success: true, data });
  } catch (error) {
    console.error('Booking request retrieval error:', error);
    return response.status(500).json({ success: false, message: 'Unable to load booking requests.' });
  }
}

async function reviewBookingRequest(request, response) {
  const { requestId } = request.params;
  const decision = request.body?.decision;
  if (!['Accepted', 'Declined'].includes(decision)) {
    return response.status(400).json({ success: false, message: 'Choose Accepted or Declined.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [requestRows] = await connection.query(
      'SELECT * FROM booking_request WHERE request_id = ? FOR UPDATE',
      [requestId]
    );
    if (!requestRows.length) {
      await connection.rollback();
      return response.status(404).json({ success: false, message: 'Booking request was not found.' });
    }
    const booking = requestRows[0];
    if (booking.status !== 'Pending') {
      await connection.rollback();
      return response.status(409).json({ success: false, message: `This booking request is already ${booking.status.toLowerCase()}.` });
    }

    let orderId = null;
    let nextState = null;
    let nextVersion = null;
    if (decision === 'Accepted') {
      const [workspaceRows] = await connection.query(
        'SELECT state_json, version FROM workspace_state WHERE state_id = 1 FOR UPDATE'
      );
      if (!workspaceRows.length) {
        await connection.rollback();
        return response.status(503).json({ success: false, message: 'The studio workspace is not initialized.' });
      }

      const previous = parseWorkspace(workspaceRows[0].state_json);
      const state = {
        customers: [],
        products: [],
        materials: [],
        orders: [],
        payments: [],
        expenses: [],
        batches: [],
        movements: [],
        ...previous
      };
      let items = parseItems(booking.items_json);
      if (!items.length) {
        items = [{ productId: booking.product_id, productName: booking.product_name, quantity: booking.quantity }];
      }

      const orderDate = new Date().toISOString().slice(0, 10);
      const dueDate = dateOnly(booking.requested_date);
      if (dueDate < orderDate) {
        await connection.rollback();
        return response.status(400).json({ success: false, message: 'The requested booking date has passed. Decline this request or ask the customer for a new date.' });
      }

      const itemProducts = items.map((item) => {
        const product = state.products.find((entry) => entry.id === item.productId)
          || state.products.find((entry) => entry.name.trim().toLowerCase() === String(item.productName).trim().toLowerCase());
        return { item, product, quantity: Number(item.quantity) };
      });
      if (itemProducts.some(({ product, quantity }) => !product || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(Number(product.price)) || Number(product.price) <= 0)) {
        await connection.rollback();
        return response.status(400).json({ success: false, message: 'A requested product is no longer available or has no valid price. Update the product catalog before accepting.' });
      }

      const phoneDigits = String(booking.phone_number || '').replace(/\D/g, '');
      const email = String(booking.email || '').trim().toLowerCase();
      let customer = state.customers.find((entry) => (
        (email && String(entry.email || '').trim().toLowerCase() === email)
        || (phoneDigits && String(entry.phone || '').replace(/\D/g, '') === phoneDigits)
      ));
      if (!customer) {
        customer = {
          id: nextId('C', state.customers),
          name: booking.customer_name,
          phone: booking.phone_number,
          email: booking.email || '',
          address: booking.delivery_address || '',
          notes: booking.notes || '',
          createdBy: request.owner.display_name,
          createdByOwnerId: request.owner.owner_id
        };
        state.customers = [...state.customers, customer];
      }

      orderId = nextId('O', state.orders);
      const orderItems = itemProducts.map(({ item, product, quantity }, index) => ({
        id: `${orderId}-item-${index + 1}`,
        productId: product.id,
        name: product.name,
        type: product.type,
        quantity,
        price: Number(product.price)
      }));
      const total = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const order = {
        id: orderId,
        customerId: customer.id,
        customer: customer.name,
        date: orderDate,
        dueDate,
        status: 'Pending',
        items: orderItems,
        shipping: 0,
        total,
        stockReserved: false,
        bookingRequestId: booking.request_id,
        createdBy: request.owner.display_name,
        createdByOwnerId: request.owner.owner_id
      };
      nextState = { ...state, orders: [order, ...state.orders] };

      if (!isValidWorkspace(nextState, previous)) {
        await connection.rollback();
        return response.status(400).json({ success: false, message: 'The accepted booking could not be converted to a valid order. No changes were saved.' });
      }

      await persistWorkspace(connection, nextState, previous, request.owner.owner_id);
      nextVersion = Number(workspaceRows[0].version || 0) + 1;
      await connection.query(
        `UPDATE workspace_state
         SET state_json = CAST(? AS JSON), version = version + 1
         WHERE state_id = 1`,
        [JSON.stringify(nextState)]
      );
    }

    await connection.query(
      `UPDATE booking_request
       SET status = ?, accepted_order_id = ?, reviewed_by_owner_id = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE request_id = ?`,
      [decision, orderId, request.owner.owner_id, requestId]
    );
    await connection.commit();
    return response.json({
      success: true,
      status: decision,
      orderId,
      ...(nextState ? { workspace: nextState, version: nextVersion } : {})
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Booking request review error:', error);
    return response.status(500).json({ success: false, message: 'Unable to review the booking request. No changes were saved.' });
  } finally {
    connection?.release();
  }
}

module.exports = { createBookingRequest, listBookingRequests, reviewBookingRequest };
