# Collect the host deposit during application

## Confirmed issue
The final host-form button promises to collect the refundable deposit, but the current submission only uploads documents and saves pending applications. No payment is created or captured.

## What will change
- Save the signed application and vehicle records as pending before sending the owner to payment.
- Create a PayPal order for exactly `$250 × vehicle count`, calculated again on the server rather than trusted from the page.
- Return the owner to a payment-completion screen that captures and verifies the PayPal order.
- Mark every application included in that payment as paid only after PayPal confirms capture; keep applications pending if payment is cancelled or fails.
- Show a truthful pending-payment state with a retry button, and show “Application received” only after successful payment.
- Keep the existing multi-vehicle agreement, document uploads, and one-row-per-vehicle behavior unchanged.

## Technical details
- Add a dedicated host-deposit payment reference linking one PayPal order to the submitted application IDs, with explicit grants and owner-only RLS.
- Add server-side create/capture actions with caller verification, exact amount validation, idempotency, CORS headers, and PayPal live-mode handling.
- Update the host form to redirect to PayPal approval and resume safely after return.
- Verify single-vehicle, multi-vehicle, cancelled-payment, retry, and successful-capture paths.
