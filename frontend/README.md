# Simula Studio Management System

The React/Vite owner workspace covers customers, multi-item orders, products and recipes, raw-material inventory, production, manual GCash/cash receipts, expenses, and printable monthly reports. Workspace records are saved to the configured MySQL database; the two owners share one workspace.

## Run locally

1. Configure the database connection in `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`).
2. For a new database, import `database/schema.sql` to create the business tables.
3. Start the API: `cd backend` then `node index.js`.
4. In another terminal, start the UI: `cd frontend` then `npm run dev`.
5. Open the Vite URL. On first run, create exactly two owner accounts. Public sign-up is then closed.

The API creates the owner-session and workspace-state tables and applies incremental schema migrations on startup. See `database/schema.sql` for the database structure. Production deployments should use HTTPS and a restricted database account.

## Owner access and data handling

- Passwords are stored as salted scrypt hashes. Owner sessions use an HTTP-only, same-site cookie and expire after eight hours.
- Password recovery validates the owner email and returns a generic delivery message; it never changes the password.
- Workspace saves update the shared JSON snapshot and normalized business tables in one MySQL transaction. Version checks prevent one owner from silently overwriting newer changes from the other owner.
- Production batches can be made from each product recipe, validate all required material balances, and add finished units to the Products cupboard in Inventory. Existing order-linked batches remain history and do not count as new finished stock.
- A first payment requires enough finished stock for every order item and reserves those units. Reservations remain unavailable after cancellation. Payments enforce a maximum of two receipts per order.
- Reports display their selected order-date or due-date basis and exclude shipping from product income.

## Validation

Run `npm run build` and `npm run lint` from `frontend`.
