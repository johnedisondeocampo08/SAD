# Google Forms booking intake

Use the canonical Apps Script source in [backend/google-apps-script/Code.gs](../backend/google-apps-script/Code.gs). It is configured to post to the deployed cloud API; do not use an ngrok URL.

1. Open the response spreadsheet linked to the Google Form, then open **Extensions > Apps Script**. Replace the editor contents with `backend/google-apps-script/Code.gs` and save.
2. In **Project Settings > Script Properties**, set `BOOKING_API_TOKEN` to the same secret configured on the Railway `simula-studio-api` service. Do not share the token.
3. Run `checkBookingProperties` and confirm the execution log shows `hasToken: true` and the Vercel booking API URL.
4. Run `installTrigger` once and approve the requested permissions. This creates a spreadsheet form-submit trigger.
5. Submit a new test form response. Question/response-sheet headers must match the field names in `Code.gs`, and product names must match active products in the app.

Check **Executions** in Apps Script for the latest `onFormSubmit` result. A `401` means the script token does not match the Railway token; a `400` usually means a required answer, header, date, quantity, or product name needs correction.
