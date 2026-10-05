# Cash App on every one-time checkout

Add a "Pay with Cash App" option next to PayPal on every one-time checkout, working like rentals: the buyer sees a pop-up with instructions (send the amount to $BestCarRentals with a payment code in the note), and nothing unlocks until an admin confirms the money arrived.

## Where it appears
- Event tickets
- Tips (performer, referrer and jackpot credited only after confirmation)
- Clothing store checkout
- One-time membership upgrades (Silver, Gold, Diamond, Silver Plus, Diamond Plus, Elite, Business Owner Elite)
- Rental host application deposit
- Rentals: already has Cash App, left unchanged

Not included: monthly memberships and FlameFlix subscriptions stay PayPal-only.

## Buyer experience
1. The buyer taps "Pay $X with Cash App".
2. A pop-up shows the amount, a short payment code, the note to include, and a "Continue to Cash App" button. It also shows the same business hours as rentals.
3. The buyer sees "Awaiting confirmation" until an admin confirms the payment.

## Admin experience
- A new "Cash App Payments" admin tab lists pending payments with buyer, item, amount, code and date.
- **Confirm** delivers the item using the same steps PayPal uses: tickets issued, upgrade applied, order marked paid, tip credited, deposit recorded. Commissions use the existing server rules.
- **Reject** cancels the payment, and the buyer gets nothing.
- The tab can be filtered by status and date, and exported to CSV.

## Technical details
- New table `cashapp_payments`: kind, reference id, user id, amount, payment code, status, confirmed_by, cashapp reference, and timestamps. Only the server can access it, and members read their own payments through the function.
- New edge function `cashapp-checkout`:
  - `create` works out the amount on the server for each kind, using the same pricing logic as the PayPal functions.
  - `confirm` and `reject` are admin-only. `confirm` runs the existing fulfillment helper for that kind, pulled out of the current PayPal capture code into `_shared/`.
- Shared React component `CashAppCheckoutButton` with a dialog, reused on every page above.
- The amount is never taken from the browser. Confirming twice is blocked by the status check, so nothing gets delivered twice.
