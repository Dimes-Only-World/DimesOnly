# Paid rental-extension statement

## What will be built
- Replace the current direct date-change action with a paid extension flow that requires whole-number mileage above the last recorded mileage.
- Calculate the extension price as extra days × daily rate, plus the required 4.5% + $1.27 transaction fee, and show the full breakdown before PayPal checkout.
- After PayPal confirms payment, extend the rental, save the mileage and paid extension history, and generate a private one-page permissive-use PDF. Failed or cancelled payments will not alter the rental or create a statement.
- Show **Download statement** immediately after success and beside every paid extension in My Rentals, including past rentals.

## PDF design
- Create a polished one-page **BEST RENTAL CAR SERVICE / STATEMENT OF PERMISSIVE MEMBER** document based on the uploaded statement.
- Fill it from trusted rental, vehicle, and member records: authorization wording, extension dates, 200-mile daily limit, vehicle details, reported odometer, renter legal name and signature line, and the Best Holdings Enterprises, Inc. / Joseph Weaver authorization block.
- Use the filename `permissive-member-{rentalId}-{paidDate}.pdf` and serve it through a renter-authorized short-lived download link.
- Produce a representative sample PDF and visually inspect the rendered page for clipping, overlap, spacing, and font problems before sharing it.

## Technical details
- Add a renter-owned extension record with immutable payment amounts, mileage, dates, PayPal references, statement storage path, and paid timestamp; enforce owner-only access.
- Add missing vehicle registration fields needed by the statement.
- Generate and store the PDF inside the server-side payment-capture action only after PayPal reports a completed capture; do not trust prices, ownership, mileage history, names, or vehicle facts supplied by the browser.
- Keep statements in private rental document storage and issue downloads only after verifying the signed-in renter owns the extension.
- Add focused tests for the mileage rule, 4.5% + $1.27 fee, successful-only PDF creation, and owner-authorized downloads.
