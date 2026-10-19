# Rentals Rules (pages, rental-booking/rental-admin functions, rental helpers)
- Finalize rental extensions only after server-verified PayPal capture, then store each permissive-use statement privately and authorize short-lived downloads through the rental extension edge function; this prevents unpaid date changes and document exposure.
- Validate rental pickup windows, long-term minimums, rent-to-own terms, and booking prices again inside `rental-booking`; browser totals and dates are display inputs, not authoritative payment data.
- Generate manual rental payment receipts only when an authorized admin marks cash or Cash App funds received, store them privately, and authorize short-lived downloads for the renter or admin.
- Reconcile rental booking and extension payments through the admin-only rental function, using recorded paid amounts and server-calculated method totals; this keeps financial reporting authoritative.
- Rental PayPal calls currently use the main PAYPAL_* secrets; RENTAL_PAYPAL_* routing is paused until the Best Rental Cars PayPal account is approved.
- Store the company's per-car monthly payment in service-role-only `vehicle_costs`, read and written only through `rental-admin`; car costs must never reach renters through the public vehicles table.
- Price short rental bookings only through the shared short-term rule (src/lib/rentalShortTerm.ts, mirrored in rental-booking/shortTerm.ts); browser display and server charge must match.
- Rental availability: src/lib/rentalAvailability.ts, mirrored in rental-booking.
- Rentals visitors sign up through `/rentals/signup` (src/pages/rentals/RentalSignup.tsx), which reuses `register-user` without media; rentals pages must link there, not `/register`, so renters get a short rentals-only form.
