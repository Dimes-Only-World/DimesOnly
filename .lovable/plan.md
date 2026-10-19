# Rental availability, no-show auto-cancel, and Notify Me deposits

## What will change

**My Rentals**
- The Cancel button only shows after a booking is paid.
- No-shows cancel automatically: if a paid renter hasn't picked up the car by the end of the pickup day, the booking is cancelled and the no-show fee is kept (2 days for trips over 3 days, 1 day for shorter trips, plus ½ delivery).
- Each booking card shows what happened when it was cancelled: who cancelled it (renter, admin or automatic no-show), the date, the amount kept, the amount refunded, and the refund status.
- A new "Notify Me holds" section lists each deposit, with **Change date** (the deposit stays on hold) and **Request refund** (PayPal refunds it automatically).

**Rentals page and car pages**
- Each car card shows the dates it's already booked.
- Starting 3 days before the next renter's pickup, the car shows as unavailable until that rental ends. Example: renter 1 picks up on the 22nd, so from the 19th the car is unavailable to everyone else until the 22nd rental is returned.
- On unavailable cars, **View car** becomes **Get Notified**, and "Currently Unavailable" becomes **Notify Me When Available**.

**Notify Me deposit**
- The renter picks dates on a calendar that starts the day after the current rental ends (for example, if the car is out until 10/22/26, the calendar opens on 10/23/26), then pays a hold deposit with PayPal or Cash App.
- When they make their final booking for that car, the deposit counts toward the payment.
- If the current renter extends past the held dates, the deposit becomes refundable. The renter gets a notification and can pick new dates or ask for a refund.
- Admin → Rentals gets a setting for the deposit amount (default $150) and a list of holds.

## Technical details
- New `rental_holds` table (service-role only): vehicle, user, wanted start and end dates, amount, payment method and ID, status (pending_payment, held, applied, refund_requested, refunded, cancelled), and timestamps. The deposit amount is stored in `app_settings`.
- New `rental_bookings` columns: `cancelled_by`, `no_show`, and cancellation summary fields.
- `rental-booking` edge function: server-side availability check (the 3-day block plus overlaps), hold creation, PayPal capture and refund, Cash App submission, date changes, and applying the deposit at booking time.
- Automatic no-show cancellation runs on a schedule from a server route that calls the edge function.
- The availability rule lives in a shared file used by both the site and the edge function, with tests.
- Cash App deposits go through the existing admin verification, and refunds for them are paid by an admin.

## Verification
- Tests for the 3-day block, no-show fees, and applying the deposit.
- Check the page layouts in the preview. Paid flows need a real renter account to test.
