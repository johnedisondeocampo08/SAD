const express = require('express');
const router = express.Router();
const { requireOwner } = require('../middleware/requireOwner');

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');

router.use(requireOwner);

// GET all customers
router.get('/', getCustomers);

// GET one customer
router.get('/:id', getCustomerById);

// CREATE a new customer
router.post('/', createCustomer);

// UPDATE an existing customer
router.put('/:id', updateCustomer);

// DELETE a customer
router.delete('/:id', deleteCustomer);

module.exports = router;