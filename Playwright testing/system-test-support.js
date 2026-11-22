const { expect, test } = require('./node_modules/@playwright/test');

const today = new Date().toISOString().slice(0, 10);

function createWorkspace() {
  return {
    customers: [
      {
        id: 'C-001',
        name: 'Demo Customer',
        phone: '09171234567',
        email: 'demo@example.test',
        address: 'Demo address',
        notes: '',
      },
    ],
    products: [
      {
        id: 'P-01',
        name: 'Scented candle · 120 ml',
        type: 'Candle',
        price: 280,
        recipe: [{ material: 'Soy wax', quantity: 0.12 }],
      },
      {
        id: 'P-03',
        name: 'Ref magnet',
        type: 'Souvenir',
        price: 45,
        recipe: [],
      },
    ],
    materials: [
      { id: 'M-01', name: 'Soy wax', unit: 'kg', stock: 8.5, threshold: 2, price: 360, active: true },
      { id: 'M-02', name: 'Sticker paper', unit: 'sheet', stock: 6, threshold: 10, price: 5, active: true },
    ],
    orders: [
      {
        id: 'O-001',
        customerId: 'C-001',
        customer: 'Demo Customer',
        date: today,
        dueDate: today,
        status: 'Pending',
        items: [
          { id: 'O-001-item-1', productId: 'P-01', name: 'Scented candle · 120 ml', type: 'Candle', quantity: 1, price: 280 },
        ],
        shipping: 0,
        total: 280,
        stockReserved: false,
      },
    ],
    payments: [],
    expenses: [],
    expenseBookMonth: today.slice(0, 7),
    batches: [
      { id: 'B-001', productId: 'P-01', product: 'Scented candle · 120 ml', quantity: 5, date: `${today}T09:00:00.000Z` },
    ],
    movements: [],
  };
}

async function installSystemTestMocks(page, workspaceOverrides = {}) {
  const state = {
    workspace: { ...createWorkspace(), ...structuredClone(workspaceOverrides) },
    workspaceVersion: 1,
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let response;

    if (url.pathname === '/api/auth/status' && method === 'GET') {
      response = { success: true, setupRequired: false };
    } else if (url.pathname === '/api/auth/me' && method === 'GET') {
      response = { success: true, data: { display_name: 'Demo Owner', owner_id: 'owner-demo' } };
    } else if (url.pathname === '/api/workspace' && method === 'GET') {
      response = { success: true, data: state.workspace, version: state.workspaceVersion };
    } else if (url.pathname === '/api/workspace' && method === 'PUT') {
      const body = request.postDataJSON();
      state.workspace = body.data;
      state.workspaceVersion += 1;
      response = { success: true, version: state.workspaceVersion, savedAt: new Date().toISOString() };
    } else if (url.pathname === '/api/booking-requests' && method === 'GET') {
      response = { success: true, data: [] };
    } else {
      response = { success: false, message: `Unexpected test API request: ${method} ${url.pathname}` };
    }

    await route.fulfill({ json: response });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good morning, studio owners' })).toBeVisible();
  return state;
}

async function openModule(page, name) {
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: new RegExp(name) })
    .click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

module.exports = { expect, installSystemTestMocks, openModule, test };
