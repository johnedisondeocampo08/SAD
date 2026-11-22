const { expect, test } = require('./node_modules/@playwright/test');

const products = [
  { id: 'P-01', name: 'Scented candle · 120 ml', type: 'Candle', price: 280, recipe: [] },
  { id: 'P-03', name: 'Ref magnet', type: 'Souvenir', price: 45, recipe: [] },
  { id: 'P-04', name: 'Acrylic keychain', type: 'Souvenir', price: 85, recipe: [] },
];

const initialWorkspace = {
  customers: [],
  products,
  materials: [],
  orders: [],
  payments: [],
  expenses: [],
  expenseBookMonth: '2026-11',
  batches: [],
  movements: [],
};

const bookings = [
  {
    requestId: 'booking-accept',
    customerName: 'Demo Accept',
    phoneNumber: '09171234567',
    email: 'accept@example.test',
    items: [
      { productId: 'P-01', productName: products[0].name, quantity: 2 },
      { productId: 'P-03', productName: products[1].name, quantity: 1 },
      { productId: 'P-04', productName: products[2].name, quantity: 3 },
    ],
    requestedDate: '2099-12-01',
    notes: 'Playwright fake booking',
    deliveryAddress: 'Demo address',
    status: 'Pending',
    createdAt: '2026-11-22T09:00:00.000Z',
  },
  {
    requestId: 'booking-decline',
    customerName: 'Demo Decline',
    phoneNumber: '09170000000',
    email: 'decline@example.test',
    items: [{ productId: 'P-03', productName: products[1].name, quantity: 1 }],
    requestedDate: '2099-12-02',
    notes: '',
    deliveryAddress: '',
    status: 'Pending',
    createdAt: '2026-11-22T09:01:00.000Z',
  },
];

test('owner can review multi-item bookings and accept or decline them', async ({ page }) => {
  let workspace = structuredClone(initialWorkspace);
  let workspaceVersion = 1;
  const requests = structuredClone(bookings);
  const reviewCalls = [];
  const workspaceWrites = [];

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
      response = { success: true, data: workspace, version: workspaceVersion };
    } else if (url.pathname === '/api/workspace' && method === 'PUT') {
      const body = request.postDataJSON();
      workspaceWrites.push(body.data);
      workspace = body.data;
      workspaceVersion += 1;
      response = { success: true, version: workspaceVersion, savedAt: new Date().toISOString() };
    } else if (url.pathname === '/api/booking-requests' && method === 'GET') {
      response = { success: true, data: requests };
    } else if (url.pathname.match(/^\/api\/booking-requests\/[^/]+\/review$/) && method === 'PATCH') {
      const requestId = decodeURIComponent(url.pathname.split('/')[3]);
      const body = request.postDataJSON();
      const booking = requests.find((entry) => entry.requestId === requestId);
      reviewCalls.push({ requestId, decision: body.decision });

      if (!booking || booking.status !== 'Pending') {
        await route.fulfill({ status: 409, json: { success: false, message: 'Booking is not pending.' } });
        return;
      }

      booking.status = body.decision;
      let orderId = null;
      if (body.decision === 'Accepted') {
        const orderItems = booking.items.map((item, index) => {
          const product = products.find((entry) => entry.id === item.productId);
          return {
            id: `O-001-item-${index + 1}`,
            productId: product.id,
            name: product.name,
            type: product.type,
            quantity: item.quantity,
            price: product.price,
          };
        });
        const customer = {
          id: 'C-001',
          name: booking.customerName,
          phone: booking.phoneNumber,
          email: booking.email,
          address: booking.deliveryAddress,
          notes: booking.notes,
        };
        orderId = 'O-001';
        const order = {
          id: orderId,
          customerId: customer.id,
          customer: customer.name,
          date: '2026-11-22',
          dueDate: booking.requestedDate,
          status: 'Pending',
          items: orderItems,
          shipping: 0,
          total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          stockReserved: false,
          bookingRequestId: booking.requestId,
        };
        workspace = {
          ...workspace,
          customers: [...workspace.customers, customer],
          orders: [order, ...workspace.orders],
        };
        workspaceVersion += 1;
      }
      response = {
        success: true,
        status: booking.status,
        orderId,
        ...(body.decision === 'Accepted' ? { workspace, version: workspaceVersion } : {}),
      };
    } else {
      response = { success: false, message: `Unexpected test API request: ${method} ${url.pathname}` };
    }

    await route.fulfill({ json: response });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Orders/ }).click();
  await page.getByRole('button', { name: /Booking requests/ }).click();

  await expect(page.getByRole('button', { name: 'Booking requests' })).toContainText('2');
  await expect(page.getByText('Demo Accept')).toBeVisible();
  await page.getByRole('row').filter({ hasText: 'Demo Accept' })
    .getByRole('button', { name: 'View all order items for Demo Accept' })
    .click();
  const itemsDialog = page.getByRole('dialog', { name: 'Order items' });
  await expect(itemsDialog.locator('.booking-item-row')).toHaveCount(3);
  await expect(itemsDialog.locator('.booking-item-row').nth(0)).toContainText('Scented candle · 120 ml');
  await expect(itemsDialog.locator('.booking-item-row').nth(0)).toContainText('2 ×');
  await expect(itemsDialog.locator('.booking-item-row').nth(1)).toContainText('Ref magnet');
  await expect(itemsDialog.locator('.booking-item-row').nth(1)).toContainText('1 ×');
  await expect(itemsDialog.locator('.booking-item-row').nth(2)).toContainText('Acrylic keychain');
  await expect(itemsDialog.locator('.booking-item-row').nth(2)).toContainText('3 ×');
  await itemsDialog.getByRole('button', { name: 'Close order items' }).click();

  await page.getByRole('row').filter({ hasText: 'Demo Accept' }).getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByText('Booking accepted and added as order O-001.')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Pending 1/ })).toBeVisible();
  await page.getByRole('tab', { name: /Accepted 1/ }).click();
  await expect(page.getByText('Order O-001', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: /Pending 1/ }).click();
  await page.getByRole('row').filter({ hasText: 'Demo Decline' }).getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByText('Booking declined.')).toBeVisible();
  await page.getByRole('tab', { name: /Declined 1/ }).click();
  await expect(page.getByText('Demo Decline')).toBeVisible();

  expect(reviewCalls).toEqual([
    { requestId: 'booking-accept', decision: 'Accepted' },
    { requestId: 'booking-decline', decision: 'Declined' },
  ]);
  expect(workspace.orders).toHaveLength(1);
  expect(workspace.orders[0].items).toHaveLength(3);
  expect(workspace.orders[0].stockReserved).toBe(false);
  expect(workspace.payments).toHaveLength(0);
  expect(workspaceWrites.length).toBeGreaterThan(0);
});
