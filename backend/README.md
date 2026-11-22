# Backend booking-request intake

The public form endpoint stores a booking separately from confirmed orders. It does not create a customer, reserve finished stock, or record a payment.

## Configure the intake token

Set `BOOKING_API_TOKEN` in the backend environment to a random secret of at least 32 characters. Keep it out of source control and use the exact same secret in Google Apps Script Script Properties. Do not send the value in chat.

The endpoint should only be called over HTTPS outside local development.

## Public form endpoint

`POST /api/booking-requests`

Send `Authorization: Bearer <BOOKING_API_TOKEN>` and a JSON body with this shape:

```json
{
  "submissionId": "spreadsheet-id:response-row-number",
  "customerName": "Demo Customer",
  "phoneNumber": "555-0100",
  "email": "demo@example.com",
  "items": [
    { "productName": "Scented candle · 120 ml", "quantity": 1 }
  ],
  "requestedDate": "2026-12-01",
  "notes": "",
  "deliveryAddress": ""
}
```

Each product name must match an active product in the current workspace. A booking can contain up to five product/quantity items. The date must be `YYYY-MM-DD`; each quantity must be an integer from 1 through 10000. `email`, `notes`, and `deliveryAddress` may be empty. A legacy single-product payload with `productName` and `quantity` is also accepted.

The first accepted submission returns HTTP `201` with a request ID and `Pending` status. Repeating the same submission ID and content returns HTTP `200` with `duplicate: true`; reusing that ID with different content returns HTTP `409`.

## Owner-only review endpoints

`GET /api/booking-requests` requires the existing owner session cookie and returns booking requests with their item arrays and status, newest first.

`PATCH /api/booking-requests/:requestId/review` also requires the owner session and a JSON body containing `{"decision":"Accepted"}` or `{"decision":"Declined"}`. Accepting atomically creates a normal pending order using current catalog prices, links or creates the customer by email/phone, records the requested date as due date, and marks the request accepted. It does not record payment or reserve stock. Declined requests remain in the request list with their declined status.

## Production deployment

For the fake-data demo, host this API and MySQL in the same Railway project so the database remains private. See the [frontend deployment guide](../frontend/README.md#deploy-a-fake-data-demo-to-vercel-and-railway) for service setup, Vercel API routing, schema import, and environment variables. Never commit real database credentials or the booking token.
