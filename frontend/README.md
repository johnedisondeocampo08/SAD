# Simula Studio Management System

The React/Vite owner workspace covers customers, multi-item orders, products and recipes, raw-material inventory, production, manual GCash/cash receipts, expenses, and printable monthly reports. Workspace records are saved to the configured MySQL database; the two owners share one workspace.

## Run locally

Run these commands from the repository root.

1. Configure the database connection in `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`).
2. For a new database, import `database/schema.sql` to create the business tables.
3. Install API dependencies and start it: `cd backend`, `npm install`, then `npm start`.
4. In another terminal, start the UI: `cd frontend` then `npm run dev`.
5. Open the Vite URL. On first run, create exactly two owner accounts. Public sign-up is then closed.

The API creates the owner-session and workspace-state tables and applies incremental schema migrations on startup. See `database/schema.sql` for the database structure. Production deployments should use HTTPS and a restricted database account.

## Owner access and data handling

- Passwords are stored as salted scrypt hashes. Owner sessions use an HTTP-only, same-site cookie and expire after eight hours.
- Password recovery validates the owner email and returns a generic delivery message; it never changes the password.
- Workspace saves update the shared JSON snapshot and normalized business tables in one MySQL transaction. Version checks prevent one owner from silently overwriting newer changes from the other owner.
- Production batches can be made from each product recipe, validate all required material balances, and add finished units to the Products cupboard in Inventory. Existing order-linked batches remain history and do not count as new finished stock.
- Google Form booking requests appear from the Orders module. Owners can review pending, accepted, and declined submissions; accepting creates a pending order at current catalog prices and links or creates a customer, without taking payment or reserving stock. The Apps Script integration supports up to three Product/Quantity pairs; update the script in `backend/google-apps-script/Code.gs` and retain its Script Properties when replacing the Google Apps Script editor contents.
- A first payment requires enough finished stock for every order item and reserves those units. Reservations remain unavailable after cancellation. Payments enforce a maximum of two receipts per order.
- Expense books track monthly payments, editable installment terms, paid months, and the full purchase commitment. Active installments carry into later books until their term is complete; the Time skip action is available after all due items in a book are paid.
- Reports display their selected order-date or due-date basis and exclude shipping from product income.

## Validation

Run `npm run build` and `npm run lint` from `frontend`.

## Deploy a fake-data demo to Vercel and Railway

The frontend is deployed to Vercel, and the Express API and MySQL database run in the same Railway project. The database stays on Railway's private network; the Vercel rewrite keeps browser requests same-origin so owner-session cookies work. This setup is for a non-commercial demo with fake data only. Do not migrate real customer or business data.

Current demo: https://frontend-ivory-one-11.vercel.app/

Railway API: https://simula-studio-api-production.up.railway.app

1. In the Railway project, create a MySQL service and an API service. Set the API's `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` to private Railway references from the MySQL service, and set `DB_NAME=simula_studio_db`, `NODE_ENV=production`, and a random `BOOKING_API_TOKEN` of at least 32 characters.
2. Before starting the API, import `../database/schema.sql`, then import `../database/seed.sql` once into the clean demo database. The seed contains fake sample records and is not idempotent.
3. Deploy the `backend` directory to the API service. Generate its Railway domain on port `5000`; the backend listens on Railway's `PORT`.
4. Set the API destination in `vercel.json` to `https://simula-studio-api-production.up.railway.app/api/:path*`. Deploy the `frontend` directory to Vercel with `npx.cmd vercel --prod`. These CLI deployments upload local files and do not require a GitHub push.
5. For Google Apps Script booking intake, use `backend/google-apps-script/Code.gs` and set `BOOKING_API_TOKEN` in Script Properties to the same secret stored in Railway. The script posts to the deployed Vercel API route and does not need ngrok.

Keep database credentials and the booking token out of Git and chat. Railway trial credits can expire; stop if a provider requests payment or an upgrade. Vercel Hobby and this demo setup are not for commercial use or real customer data.
