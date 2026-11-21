
const db = require('../config/db');

// GET all customers
const getCustomers = async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT customer_id, full_name, contact_number,
             email, address, notes
      FROM customer
      ORDER BY full_name ASC
    `);

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('Get customers error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve customers'
    });
  }
};

// GET one customer
const getCustomerById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM customer WHERE customer_id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Get customer error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve customer'
    });
  }
};

// CREATE customer
const createCustomer = async (req, res) => {
  try {
    const {
      full_name,
      contact_number,
      email,
      address,
      notes
    } = req.body;

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      full_name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid full name is required'
      });
    }

    const [rows] = await db.query(`
      SELECT MAX(
        CAST(SUBSTRING(customer_id, 5) AS UNSIGNED)
      ) AS last_number
      FROM customer
      WHERE customer_id REGEXP '^CUST[0-9]+$'
    `);

    const nextNumber = (rows[0].last_number || 0) + 1;
    const customer_id =
      `CUST${String(nextNumber).padStart(3, '0')}`;

    await db.query(
      `INSERT INTO customer
       (customer_id, full_name, contact_number,
        email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        full_name.trim(),
        contact_number || null,
        email || null,
        address || null,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer_id }
    });
  } catch (error) {
    console.error('Create customer error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to create customer'
    });
  }
};

// UPDATE customer
const updateCustomer = async (req, res) => {
  try {
    const {
      full_name,
      contact_number,
      email,
      address,
      notes
    } = req.body;

    if (
      typeof full_name !== 'string' ||
      !full_name.trim() ||
      full_name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid full name is required'
      });
    }

    const [result] = await db.query(
      `UPDATE customer
       SET full_name = ?,
           contact_number = ?,
           email = ?,
           address = ?,
           notes = ?
       WHERE customer_id = ?`,
      [
        full_name.trim(),
        contact_number || null,
        email || null,
        address || null,
        notes || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Update customer error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to update customer'
    });
  }
};

// DELETE customer
const deleteCustomer = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM customer WHERE customer_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a customer with related records'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Unable to delete customer'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};