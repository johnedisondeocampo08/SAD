# Simula Studio system testing

## Run the tests

From PowerShell:

```powershell
Set-Location 'E:\Project SAD\SAD\Playwright testing'
npm test
```

The test command starts the frontend through Vite. Browser test output and failure traces are stored in `test-results/`.

## Automated test cases

| ID | Module(s) | Test coverage |
|---|---|---|
| ST-01 | Orders / Booking requests | Display pending count and multi-item booking; accept a booking into an order; decline another booking; verify no payment or stock reservation is created. |
| ST-02 | Customers | Add a customer, edit the customer, and search the customer list. |
| ST-03 | Products | Add a product and filter products by category. |
| ST-04 | Inventory / Production | Restock a raw material, record production, and verify recipe deductions and the resulting batch. |
| ST-05 | Orders / Payments | Review an order, record a partial receipt, and verify the remaining balance and receipt. |
| ST-06 | Expenses / Reports | Record an installment expense, mark its current-month payment as paid, and verify monthly report values and reporting basis. |

## Test environment and limits

These are browser-level system workflow tests against the frontend, with API requests intercepted and supplied with fake data. They are safe to run without a live MySQL database, Google Form, booking token, or ngrok tunnel.

The suite verifies visible workflows and frontend state changes, but does **not** verify the real backend, MySQL persistence, live authentication, Google Forms delivery, or deployment configuration. Those require a separate integration/system test run against a controlled test server and test database.

The test data is disposable and must not contain real customer information. Do not copy production credentials or personal data into test files.

## Bug logging

Record each reproducible defect in `bug-log.csv`. Assign an ID such as `BUG-001`, include the test case ID where relevant, and attach a screenshot or trace from `test-results/`. Set status to `Open`, `In progress`, `Fixed`, or `Retest`; after a fix, rerun the affected test and record the retest result.

Suggested severity:

- **Critical** — system unavailable, data loss/corruption, or a core workflow cannot be completed.
- **High** — a major module or essential workflow is blocked, with no reasonable workaround.
- **Medium** — a feature is incorrect or unreliable but a workaround exists.
- **Low** — minor visual, wording, or non-blocking usability issue.

Priority is the order in which the team plans to address the bug; it can differ from severity.
