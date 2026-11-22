const { expect, installSystemTestMocks, openModule, test } = require('./system-test-support');

test('owner can add, edit, and search customer records', async ({ page }) => {
  await installSystemTestMocks(page);
  await openModule(page, 'Customers');

  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.getByLabel('Full name').fill('Jamie Test');
  await page.getByLabel('Contact number').fill('09170001111');
  await page.getByLabel('Email address').fill('jamie@example.test');
  await page.getByRole('button', { name: 'Save customer' }).click();

  const customerRow = page.getByRole('row').filter({ hasText: 'Jamie Test' });
  await expect(customerRow).toBeVisible();
  await customerRow.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Full name').fill('Jamie Updated');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Jamie Updated' })).toBeVisible();

  await page.getByPlaceholder('Search name, phone, or email').fill('jamie');
  await expect(page.getByRole('row').filter({ hasText: 'Jamie Updated' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Demo Customer' })).toHaveCount(0);
});

test('owner can add a product and filter the catalog by type', async ({ page }) => {
  await installSystemTestMocks(page);
  await openModule(page, 'Products');

  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name').fill('Test Keepsake');
  await page.getByLabel('Product type').selectOption({ label: 'Souvenir' });
  await page.getByLabel('Selling price (₱)').fill('125');
  await page.getByRole('button', { name: 'Save product' }).click();

  await expect(page.getByRole('heading', { name: 'Test Keepsake' })).toBeVisible();
  await page.getByLabel('Filter products by category').selectOption('Candle');
  await expect(page.getByRole('heading', { name: 'Scented candle · 120 ml' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test Keepsake' })).toHaveCount(0);
});

test('owner can restock material and record production with the recipe deduction', async ({ page }) => {
  const state = await installSystemTestMocks(page);
  await openModule(page, 'Inventory');

  const soyWaxRow = page.getByRole('row').filter({ hasText: 'Soy wax' });
  await soyWaxRow.getByRole('button', { name: 'Add stock' }).click();
  await page.getByLabel('Quantity (kg)').fill('2');
  await page.getByLabel('Reason').fill('Test supplier restock');
  await page.getByRole('button', { name: 'Save stock update' }).click();
  await expect(page.getByText('Soy wax stock updated.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Soy wax' })).toContainText('10.5 kg');

  await openModule(page, 'Production');
  const candleCard = page.locator('.production-product-card').filter({ hasText: 'Scented candle · 120 ml' });
  await candleCard.getByRole('button', { name: 'Create product' }).click();
  await page.getByLabel('Quantity to make').fill('2');
  await page.getByRole('button', { name: 'Create products' }).click();

  await expect(page.getByText('Made 2 × Scented candle · 120 ml. Materials were checked and deducted together.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'B-001' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'B-002' })).toContainText('2');
  await expect.poll(() => state.workspace.materials.find((material) => material.id === 'M-01').stock).toBeCloseTo(10.26);
  expect(state.workspace.materials.find((material) => material.id === 'M-01').stock).toBeCloseTo(10.26);
  expect(state.workspace.batches[0].quantity).toBe(2);
});

test('owner can review an order and record a payment receipt', async ({ page }) => {
  const state = await installSystemTestMocks(page);
  await openModule(page, 'Orders');
  await expect(page.getByRole('row').filter({ hasText: 'O-001' })).toContainText('Demo Customer');
  await expect(page.getByRole('row').filter({ hasText: 'O-001' })).toContainText('1 × Scented candle · 120 ml');

  await openModule(page, 'Payments');
  const orderRow = page.getByRole('row').filter({ hasText: 'O-001' });
  await expect(orderRow).toContainText('₱280.00');
  await orderRow.getByRole('button', { name: 'Record payment' }).click();
  await page.getByLabel('Amount (₱)').fill('100');
  await page.getByLabel('Reference number (optional)').fill('TEST-RECEIPT-001');
  await page.getByRole('button', { name: 'Save payment' }).click();

  await expect(page.getByText('Payment recorded. Remaining balance: ₱180.00.')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'TEST-RECEIPT-001' })).toBeVisible();
  await expect.poll(() => state.workspace.payments.length).toBe(1);
  expect(state.workspace.payments).toHaveLength(1);
  expect(state.workspace.payments[0].amount).toBe(100);
});

test('owner can log an installment expense and view it in the monthly report', async ({ page }) => {
  const state = await installSystemTestMocks(page);
  await openModule(page, 'Expenses');

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Category').selectOption('Utilities');
  await page.getByLabel('Expense name').fill('Test studio electricity');
  await page.getByLabel('Monthly payment (₱)').fill('500');
  await page.getByLabel('Installment duration (months)').fill('2');
  await page.getByRole('button', { name: 'Save expense' }).click();

  const expenseRow = page.getByRole('row').filter({ hasText: 'Test studio electricity' });
  await expect(expenseRow).toBeVisible();
  await expect(expenseRow).toContainText('2 months');
  await expenseRow.getByRole('button', { name: 'Paid' }).click();
  await expect(page.getByText('Expense marked as paid.')).toBeVisible();

  await openModule(page, 'Reports');
  await expect(page.getByText('MONTHLY BUSINESS REPORT')).toBeVisible();
  await expect(page.getByText('Business expenses recorded this month')).toBeVisible();
  await expect(page.locator('.report-expenses')).toContainText('₱500.00');
  await page.getByLabel('REPORTING BASIS').selectOption('due');
  await expect(page.locator('.report-basis-note')).toContainText('due date');

  await expect.poll(() => state.workspace.expenses.length).toBe(1);
  await expect.poll(() => state.workspace.expenses[0].paidMonths.length).toBe(1);
  expect(state.workspace.expenses).toHaveLength(1);
  expect(state.workspace.expenses[0].installmentMonths).toBe(2);
  expect(state.workspace.expenses[0].paidMonths).toHaveLength(1);
});
