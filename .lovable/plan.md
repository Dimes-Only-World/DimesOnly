# Car Rental Section

Full rental module at `/rentals` with admin management, public browsing, booking flow requiring admin approval, and two-level 10%/10% referral commissions. Payments extend the existing PayPal integration.

## 1. Database (Supabase migration)

New tables in `public`, all with RLS + GRANTs:

- **vehicles** — year, make, model, vin, license_plate, mileage, description, features (jsonb), vehicle_type, pickup_location, day_rate, weekly_rate, monthly_rate, down_payment, rental_options (text[]: daily/weekly/monthly/long_term/rent_to_own), availability_status, is_active, created_by, timestamps.
- **vehicle_media** — vehicle_id, media_type ('photo'|'video'), url, storage_path, sort_order. Enforce ≤25 photos / ≤3 videos in an insert trigger.
- **rental_bookings** — vehicle_id, renter_user_id, rental_type, start_date, end_date, pickup_location, total_price, down_payment_amount, status ('pending'|'approved'|'rejected'|'paid'|'active'|'completed'|'cancelled'), signature_text, signed_at, license_url, insurance_url, paypal_order_id, referrer_username, upline_referrer_username, timestamps.
- **rental_commissions** — booking_id, user_id, commission_type ('direct'|'upline'), amount, status ('pending'|'paid'), payout_id.

Storage buckets:
- `vehicle-media` (public) — photos/videos.
- `rental-documents` (private) — signed URLs for ID + insurance.

RLS summary (plain English):
- Anyone can view active vehicles and their media.
- Only admins can insert/update/delete vehicles and vehicle media.
- Signed-in users can create their own bookings and view their own bookings + commissions.
- Admins can view/manage all bookings, documents, and commissions.

## 2. Admin panel (new tab in AdminDashboard)

- Vehicles list with add/edit/delete.
- Vehicle form: all specs + rental option checkboxes + rates + pickup location.
- Media manager: drag-drop up to 25 photos + 3 videos, reorder, delete. Uploads go through an edge function using service role.
- Bookings queue: filter by status; view uploaded license/insurance via signed URLs; Approve/Reject actions. On Approve → status becomes `approved` and renter is notified to pay.
- Commissions view: list all commissions, mark paid, tie into existing payout flow.

## 3. Public pages

- `/rentals` — grid of active vehicles: hero photo, year/make/model, starting rate, "View Details". Filters: vehicle_type, price range, rental_option, availability. Consistent with existing dark purple/magenta design system.
- `/rentals/:id` — gallery (photos + videos), full specs, rate table, "Rent This Car" CTA. Uses `GlobalProfileButton` like other public pages.

## 4. Booking flow

Multi-step form on `/rentals/:id/book` (auth required):
1. Rental type + pickup date/time + duration → dynamic price + down payment calc.
2. Upload driver's license, upload proof of insurance (private bucket).
3. Digital signature (typed full name + timestamp) + agreement acceptance.
4. Review → submit as `pending`.

After submission: admin reviews → on approval, renter receives notification with PayPal payment link → payment webhook marks booking `paid` and triggers commissions.

## 5. Referral commissions (two levels, 10% each)

On booking `paid`:
- Look up renter's `referred_by` (direct referrer) → 10% of total_price → insert `rental_commissions` row + credit weekly earnings.
- Look up direct referrer's `referred_by` (upline) → 10% of total_price → same.
- Reuses existing weekly_earnings and payout infrastructure.

## 6. Edge functions

- `rental-admin` — admin-only CRUD for vehicles/media/bookings (bcrypt-verified admin session, service role internally).
- `create-rental-booking` — validates input, uploads docs to private bucket, inserts pending booking.
- `create-rental-paypal-order` — creates PayPal order for approved booking (extends existing PayPal setup).
- `rental-paypal-webhook` — on capture: marks booking paid, calls commission function, sends confirmation email.
- `process-rental-commissions` — computes and inserts direct + upline commissions.

## 7. Navigation

- Dashboard "Get a Car" button → `/rentals`.
- Add `/rentals` and `/rentals/:id` and `/rentals/:id/book` to `App.tsx` routes.
- `GlobalProfileButton` already covers non-auth pages.

## 8. Notifications / emails

- On booking submission → renter + admin notified.
- On approval → renter notified with payment link.
- On payment → renter gets confirmation, referrers get commission notifications.

## Technical notes

- File uploads: photos ≤10MB, videos ≤200MB, enforced client + edge function.
- Rate calculation: `daily × days`, `weekly × weeks`, `monthly × months`, long-term/rent-to-own require down payment upfront.
- Insurance/license URLs stored as storage paths; served only via short-lived signed URLs from an edge function to admin + booking owner.
- All admin actions go through edge functions (never client-side service role).
- Follow existing patterns: sessionStorage admin auth via `check_admin_by_user_id`, Supabase Auth for renters.

## Delivery order

1. Migration (schema + RLS + GRANTs + buckets).
2. Admin edge function + admin UI (vehicles + media).
3. Public `/rentals` + detail page.
4. Booking flow + document uploads + admin approval UI.
5. PayPal order + webhook + commissions + notifications.
