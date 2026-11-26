# Simula Studio Management System

Simula Studio is a web-based management system for a handmade-products business. It brings customer records, bookings, products, material inventory, production, orders, payments, expenses, and reports into one shared owner workspace.

The frontend is built with React and Vite. The backend uses Node.js and Express with a MySQL database.

## Run It (Windows, macOS or Linux)

Requires Node.js 20 or newer and MySQL 8.0 or newer.

```bash
# 1. Create the database
mysql -u root -p < database/schema.sql

# 2. Start the backend
cd backend
cp .env.example .env
npm install
npm start

# 3. Start the frontend in another terminal
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. On a new database, complete the first-run setup to create exactly two owner accounts.

## Demo Accounts

| Role | Email address(example) | Password |
| Owner | example@gmail.com | Edison100805 |
| Co-Owner | example1@gmail.com | Harly091806 |

The system has no public registration. The first-run setup creates exactly two owner accounts.

## Live Demo

- Frontend: https://frontend-ivory-one-11.vercel.app/
- Backend: https://simula-studio-api-production.up.railway.app

Use fictional customer and business data only.

## Screens and Where the Code Lives

| Screen | App | Process |
|---|---|---|
| Sign in / Register Staff Account | `backend/routes/authRoutes.js` | 1.0 |
| Overview Dashboard | `frontend/src/App.jsx` | 2.0 |
| Customers | `frontend/src/pages/CustomerPage.jsx` | 3.0 |
| Products and Recipes | `frontend/src/App.jsx` | 4.0 |
| Raw-Material Inventory | `frontend/src/App.jsx` | 5.0 |
| Production | `frontend/src/App.jsx` | 6.0 |
| Orders and Booking Requests | `frontend/src/App.jsx` | 7.0 |
| Payments | `frontend/src/App.jsx` | 8.0 |
| Expenses | `frontend/src/App.jsx` | 9.0 |
| Reports | `frontend/src/App.jsx` | 10.0 |

## How It Behaves

- The workspace is restricted to exactly two owner accounts.
- Owners share customer, order, product, inventory, payment, and expense records.
- A customer can be created directly or while creating an order.
- Booking requests remain separate from confirmed customer orders.
- Accepting a booking creates a pending order using current product prices.
- Production validates and deducts every required recipe material in one database operation.
- Successful production adds finished units to inventory.
- Cash or GCash payments are manual payment records.
- The first payment reserves finished units for the order.
- An order allows at most two payment receipts.
- Cancelled or delivered orders cannot receive further payment actions.
- Shipping is recorded separately and excluded from product-sales reports.
- Expense books show monthly payments and installment commitments.
- Reports use the selected month and order-date or due-date basis.
- Printing uses the browser print dialog.

## Booking Requests

The Google Apps Script in `backend/google-apps-script/Code.gs` sends form submissions to:

```text
POST /api/booking-requests
```

Set `BOOKING_API_TOKEN` in both the backend environment and Google Apps Script Project Settings.

The endpoint:

- Stores each submission once using its submission ID.
- Accepts up to five product and quantity pairs.
- Returns `201` for a new request.
- Returns `200` for an identical duplicate.
- Returns `409` when a submission ID is reused with changed content.
- Allows owners to accept or decline pending requests.

Accepting a request creates a customer and a pending order but does not reserve stock or record a payment.

## Database

The main database tables are:

- customer
- product_variant
- material
- variant_material_recipe
- customer_order
- order_item
- payment
- production_batch
- batch_material_usage
- inventory_movement
- expense
- owner_account
- owner_session
- booking_request
- workspace_state

For the complete schema, see [database/schema.sql](./database/schema.sql).

## Tests

Frontend build and lint checks:

```bash
cd frontend
npm run build
npm run lint
```

Start the API and frontend separately for manual end-to-end tests.

Browser test materials are in [Playwright testing](./Playwright%20testing/).

## Limits to Know About

- Total sales include finalized order product values; shipping is not sales income.
- Refunds and reversals are not automatically subtracted from the sales report.
- Currency is displayed as Philippine pesos (`PHP`).
- Time-based records use the configured application or server timezone.
- Payments are recorded only after an owner enters them; Simula Studio does not transfer money.
- Password recovery sends a generic response and does not reset a password automatically.
- Reports are management summaries, not audited financial statements.

## Deploy Notes

- `frontend` builds with Vite and can be deployed to Vercel.
- `backend` runs the Express API and listens on the platform-provided `PORT`.
- Railway can host the Express API and MySQL database.
- `frontend/vercel.json` rewrites `/api/*` requests to the Railway API.
- Import `database/schema.sql` before starting a new database.
- The API initializes or updates its required tables on startup.
- Use an HTTPS origin and restricted MySQL account for deployment.
- `.env` and `.env.example` must not contain real credentials.

## Deploy Free on Render

Deploying the API and MySQL database is provider-dependent. The documented demo currently uses Vercel and Railway.

To change providers:

1. Push this repository to GitHub.
2. Create a MySQL database.
3. Deploy `backend` as a Node web service.
4. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, and `BOOKING_API_TOKEN`.
5. Deploy `frontend` and route `/api/*` requests to the backend.

Use the deployment documentation in [frontend/README.md](./frontend/README.md) as a starting point.

## Documentation

- [User Manual](./User%20Manual.md)
- [System Demonstration Guide](./System%20Demonstration%20Guide.md)
- [Frontend Setup](./frontend/README.md)
- [Backend and Booking API](./backend/README.md)
- [Database Schema](./database/schema.sql)
- [Browser Test Plan](./Playwright%20testing/system-test-plan.md)
