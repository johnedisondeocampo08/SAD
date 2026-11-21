
const API_BASE_URL = '/api/customers';

// GET all customers
export async function getCustomers(signal) {
  const response = await fetch(API_BASE_URL, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || 'Customer API returned an error'
    );
  }

  return result.data;
}

// POST - Create a new customer
export async function createCustomer(customerData) {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerData),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || 'Failed to create customer'
    );
  }

  return result.data;
}
