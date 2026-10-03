# Admin Rental Payment History

## What will be added
- Add a **Payment History** section inside Admin → Rentals.
- Combine completed original booking payments and paid rental extensions in one chronological list.
- Show payment date, booking code, renter, vehicle, payment type, method, amount, and payment reference.
- Add date-range filters and a payment-method filter for All, PayPal, Cash, and Cash App.
- Show filtered totals for all payments and separate PayPal, Cash, and Cash App totals, plus transaction count.
- Include a CSV download for the currently filtered results so reconciliation can be saved or opened in a spreadsheet.
- Keep manual-payment receipt downloads available from payment-history rows when a receipt exists.

## Payment rules
- Include only verified/recorded payments: paid, active, completed, or returned bookings with a paid date, and extensions with paid status.
- Use `amount_received` for cash and Cash App; use the recorded booking total for verified PayPal payments.
- Treat paid extensions as PayPal and use their recorded `total_charged` amount.
- Apply filters and calculate totals on the server through the existing admin-only rental function.

## Technical details
- Add a validated `listPaymentHistory` action to the existing admin rental function, preserving current admin authorization.
- Add a focused payment-history component to the Rentals admin area using the existing cards, inputs, selects, and buttons.
- Add small tests for method labels, totals, date filtering, and CSV output.
- Record the reconciliation architecture rule, deploy the updated rental admin function, and verify desktop and phone layouts.
