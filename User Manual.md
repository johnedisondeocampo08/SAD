# Simula Studio User Manual

## 1. About this manual

Simula Studio is an owner workspace for managing a handmade-products business. It keeps customer records, orders, product recipes, raw materials, production batches, payments, expenses, and monthly reports together.

This manual is for the two authorized owner accounts. It describes the current owner workspace; some controls may look different on a phone or a smaller screen.

## 2. Open and sign in

1. Open the Simula Studio link provided by your system administrator. If you run the system locally, the backend and frontend services must be running first.
2. Sign in with your owner email address and password.
3. If this is the system’s first launch, complete the one-time setup by entering the display name, email, password, and confirmation for both owners. Passwords must be at least 10 characters and each confirmation must match.
4. Select **Sign in to your studio**.
5. To leave the workspace, select **Sign out**.

There is no public sign-up. The **Forgot your password?** link submits a recovery request, but does not change the password; contact the system administrator if you need help regaining access.

If the page says it cannot reach the studio, check that the studio server is running and your connection is available, then select **Try again**. If the page says changes could not be saved, avoid closing the page until the connection is restored and the save status is confirmed.

## 3. Understand the workspace

Use the navigation on the left to open a module:

- **Overview** — sales and business snapshot, open orders, outstanding balances, expenses, and low-stock reminders.
- **Orders** — create and manage customer orders, or switch to **Booking requests** to review form submissions.
- **Customers** — customer contact details and order history.
- **Products** — product catalog and material recipes.
- **Inventory** — raw-material balances, low-stock alerts, finished-product availability, and stock movement history.
- **Production** — create finished-product batches from recipes.
- **Payments** — order balances and cash or GCash receipts.
- **Expenses** — monthly expense book and installment payments.
- **Reports** — product income and expenses for a selected month.

The workspace is shared by the two owners. The save indicator at the lower left normally reads **Saved to your studio database**. If it reports a save problem, check your connection and do not assume the change was saved.

## 4. Recommended setup

Set up the catalog and inventory before processing orders:

1. In **Customers**, add customer records or add a customer while creating an order.
2. In **Products**, confirm the products, types, and prices. Set each product’s material recipe by entering the amount of each material used for one finished item. Recipe amounts use the material’s unit.
3. In **Inventory**, add raw materials with their unit, unit cost, low-stock threshold, and active status.
4. For newly added materials, use **Add stock** to record the opening balance. New materials start with zero stock.
5. In **Production**, make finished products from the configured recipes. Production checks all required raw materials before deducting any of them.

Recipes affect production deductions and the material-cost estimate shown on the Overview. Review recipes and unit costs when they change.

## 5. Customers

### Add a customer

1. Open **Customers** and select **Add customer**.
2. Enter the customer’s full name. Contact number, email, address, and notes are optional.
3. Select **Save customer**.

The system checks the email format when one is provided and validates the contact number when one is provided.

### Find, edit, or review a customer

- Use the search field to find a customer by name, phone, or email.
- Select **Edit** beside a customer to update their profile.
- Select **View All** in a customer’s Orders column to review that customer’s order history.
- Use **Print records** to print the customer list.

## 6. Products and recipes

### Add a product

1. Open **Products** and select **Add product**.
2. Enter a product name, choose **Candle** or **Souvenir**, and enter a selling price greater than zero.
3. Select **Save product**.
4. Add its recipe on the product card. For each recipe material, enter the amount used to make one unit.

### Update a recipe

- Existing recipe quantities can be edited directly on the product card; the change is applied when you leave the field.
- Select **+ Add materials usage**, choose an active material, and enter the per-item amount to add a material to the recipe.
- A recipe with no material usage cannot be used for production.

Use the product search and category filter to narrow the catalog.

## 7. Inventory and production

### Manage raw materials

In **Inventory**, the Materials cupboard lists each material’s on-hand amount, low-stock threshold, unit cost, and status.

- Select **Add material** to create a material. New materials start at zero on hand.
- Select **Add stock** beside a material to choose an action:
  - **Restock** adds the quantity entered.
  - **Remove** subtracts it; stock cannot go below zero.
  - **Set balance** changes the balance to the entered quantity.
- Enter a reason when useful (for example, supplier delivery or count correction), then save the stock update.

Inventory also shows finished-product availability and recent raw-material movements. Low-stock indicators appear when an active material is at or below its threshold.

### Record production

1. Open **Production** and select **Create product** for the product you are making, or use **Record production** at the top of the page.
2. Choose the product and enter a whole-number quantity of at least one.
3. Review any material warning, then select **Create products**.

The system checks every active recipe material before changing stock. If a material is unavailable or insufficient, no materials are deducted and no batch is recorded. A successful batch deducts recipe quantities from raw materials and adds finished items to the Products cupboard in **Inventory**.

## 8. Orders

### Create an order

1. Open **Orders** and select **Create order**. You can also start from **New order** on Overview.
2. Choose an existing customer. To add one without leaving the form, select **Add customer**, complete the details, and select **Save and select customer**.
3. Choose a product and enter its quantity and price. Select **+ Add item** to include additional products; remove a line with its **×** control.
4. Set the order date, optional due date, and shipping fee.
5. Check the displayed total, then select **Save order**.

Quantities must be whole numbers of at least one, prices must be greater than zero, and shipping cannot be negative. A due date cannot be earlier than the order date. Shipping is shown separately from product sales and is excluded from reports.

### Manage an order

- Search by order number, customer, or status; filter by order status.
- Select **Edit** to update an editable order. Cancelled or delivered orders cannot be edited. Orders with reserved stock or recorded production have additional restrictions on changing items and quantities.
- A pending order can be cancelled. Existing receipts remain recorded, and cancelled orders cannot receive further payments.
- An order in production can be marked **Delivered** when the order is fully paid and its finished products are available.
- Select the print icon beside an order to open and print its order slip.

An order moves into **In production** when it is fully paid. A delivery action is unavailable until finished stock is available.

## 9. Booking requests

Booking requests arrive through the configured booking-form integration and are separate from orders until accepted.

1. Open **Orders** and select **Booking requests**. The small number on the button shows how many requests are pending.
2. Review the customer, contact details, requested date, notes, and delivery address.
3. Select **View All** in a request row to see its product names and quantities.
4. Select **Accept** or **Decline**.
5. Use the **Pending**, **Accepted**, and **Declined** tabs to view requests by status. Select **Refresh** to request the latest list.

Accepting a request creates a normal pending order using the current product catalog prices and links or creates a customer record. It does **not** reserve finished stock or record a payment. Continue the normal production and payment steps for the new order. Declined requests remain visible under **Declined**.

If new form submissions are not appearing, ask the system administrator to check the booking integration and server connection.

## 10. Payments

Payments are recorded manually; the system does not collect money from a customer.

1. Make sure the order’s finished products have been produced and are available.
2. Open **Payments** and select **Record payment** beside an eligible order, or use the page’s **Record payment** button.
3. Enter the amount, choose **Cash** or **GCash**, and optionally enter a reference.
4. Select **Save payment** and confirm the remaining balance and receipt in the page.

Each order can have at most two receipts. The first receipt can be partial. If recording a second receipt, it must equal the entire remaining balance. The first payment reserves the order’s finished-product quantities; cancelled orders cannot receive further payments. Keep the receipt reference and amount consistent with the actual transaction.

The page shows total payments collected, outstanding balances, and receipt history.

## 11. Expenses

### Add an expense

1. Open **Expenses** and select **Add expense**.
2. Choose a category, enter an expense name and monthly payment amount, and optionally enter the installment duration, date, method, and receipt link.
3. Select **Save expense**.

Leave installment duration blank for a one-time expense. If using installments, enter the number of months as a whole number. The displayed commitment is the monthly payment multiplied by the number of months.

### Pay and review expenses

- The expense book is organized by month. Select **Paid** for an expense after that month’s payment is actually made.
- Use **Edit details** to update an expense.
- Earlier months can be viewed with the month selector. Adding a new expense is available only in the current expense-book month.
- **Time skip** becomes available when all expenses due in the current book have been marked paid. It advances the expense book to the next month.

Marking an expense paid updates the record; it does not transfer money or verify a bank transaction.

## 12. Reports and printing

1. Open **Reports**.
2. Choose a reporting month.
3. Choose **Order date** or **Due date** as the reporting basis.
4. Review the product income, product-type totals, units sold, and expenses recorded as paid in that month.
5. Select **Print report** or the print icon in the top bar to print.

Product income is calculated from item quantities multiplied by selling prices. Shipping is excluded. Cancelled orders are excluded from product income. The report’s expense figure includes expenses marked paid in the selected month; it is not automatically deducted from the sales total.

The system can also print customer records and individual order slips from their respective modules.

## 13. Troubleshooting and good practices

| What you see | What to do |
|---|---|
| “We can’t reach your studio” | Check that the studio server and network connection are available, then select **Try again**. Contact the administrator if it continues. |
| “Couldn’t save your changes” or “Not saved” | Restore the connection, wait for the save indicator to recover, and confirm the record is still present before leaving the page. |
| A material is low or unavailable for production | Check its on-hand quantity, active status, product recipe, and unit. Record a restock if appropriate. |
| A payment action is unavailable | Check that all order items have enough finished stock and that the order has fewer than two receipts and an outstanding balance. |
| A delivery action is unavailable | Confirm that the order is fully paid and all required finished products are available. |
| A booking request is missing | Refresh the booking list. If it remains missing, contact the administrator to check the form integration. |
| A report total looks unexpected | Check the selected month and reporting basis. Remember that shipping is excluded and only expenses marked paid count in the report’s expense figure. |

For reliable records:

- Record stock changes and payments when they occur.
- Use consistent product and material names, units, and recipes.
- Check the save indicator after important changes.
- Keep customer information accurate and only enter data needed for business operations.
- Never share owner passwords, booking tokens, or other credentials in chats or public documents.
- Coordinate with the other owner before making changes to shared records.
