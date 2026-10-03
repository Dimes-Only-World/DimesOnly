# Rental booking terms and agreement update

## What will change

- Make rental cards, booking forms, and checkout sections span the phone screen cleanly, without horizontal overflow.
- Replace free-form booking dates with calendars that prevent past pickup dates.
- Allow pickup dates only from today through 28 days from today.
- For the monthly option, limit the rental period to no more than 28 days after pickup while charging the listed monthly rate.
- Require long-term bookings to run for at least six months.
- Set rent-to-own bookings to 48 months and show the vehicle-specific calculation: down payment + 48 monthly payments − $75.
- Put the $125 security-deposit amount on its own mobile line.
- Apply the uploaded detailed Member Agreement only to long-term and rent-to-own bookings.
- Professionally format and prefill the agreement with member, vehicle, term, mileage, registration, plate, body style, color, payment, and signature details.
- Clearly identify missing vehicle agreement fields for an administrator to complete, and prevent incomplete long-term or rent-to-own agreements from proceeding.

## Validation and security

- Enforce pickup, monthly-duration, six-month, 48-month, vehicle-field, and pricing rules in the booking Edge Function, not only in the browser.
- Recalculate booking totals from stored vehicle rates on the server so browser-submitted prices are never trusted.
- Require agreement acceptance and the typed legal-name signature before long-term or rent-to-own checkout.

## Verification

- Add tests for the 28-day monthly duration, pickup window, long-term minimum, and rent-to-own formula.
- Verify the mobile calendar, agreement presentation, pricing totals, deposit layout, and absence of horizontal overflow in the live preview.
- Confirm the project build and rental-booking Edge Function tests pass, then deploy the updated function.
