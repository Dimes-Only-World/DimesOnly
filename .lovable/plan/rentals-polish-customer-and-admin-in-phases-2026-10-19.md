# Rentals polish: customer and admin, in phases

The brand stays the same: dark theme, red #E11D26, white text, BEST Rental Cars logo. No existing features are removed. Each phase is built, checked and shown to you before the next one starts.

## Your decisions

- The 4.5% + $1.27 fee applies only to PayPal and card payments. Cash App and cash at 7-11 stay fee-free.
- Footer contact on every page: 323-454-3835, Mon–Sat 9am–5pm, Sunday closed.
- No car page videos are removed, including the one on the 2023 Cadillac XT5 page.

## Phase 1 — Fleet page and car pages

- Fleet cards are all the same height, with titles cut off after 2 lines and the location written as "Los Angeles, CA".
- Each card shows the daily, 3+ day and weekly rates. A rate line is hidden when that rate is empty.
- Every card shows View car. Rented cars also show "Available from &nbsp;" and Notify Me.
- Gray placeholder cards show while the fleet loads. Photos load lazily, and the first row loads first.
- New filters: type (economy, luxury, exotic, SUV, truck), price range, and available dates.
- Car pages: "rent-to-own" is written the same way everywhere, the Free cancellation box gets high-contrast text, and the pages use the home page's dark theme.

## Phase 2 — Booking flow and account

- A signed-out visitor who taps Rent This Car goes to sign in and comes back to that car. The "New here? Sign up" link keeps the same return.
- Before checkout, a summary shows the vehicle, pickup and return times, rate type, rate × days, deposit, fees and total.
- New /account home links to My Rentals, My Purchases, Profile and Log out. A shared account menu appears on every account page.
- New /account/profile lets users edit their name, phone, email, driver's license and password.
- My Rentals: each Notify Me hold shows the vehicle, dates, deposit, status, Pay now, Cancel hold and expiry. Current rentals show a countdown to return time.

## Phase 3 — Late returns and extensions

- A rental is due back at its end time, with a 2-hour grace period.
- After the grace period, the rental shows "Late" in red, with the fee due, on My Rentals and in admin.
- Late fee = $100 + (full hours past grace × hourly rate). The hourly rate is the admin hourly rate, or the daily rate ÷ 24 if none is set.
- The late fee is waived if the renter extends on the same calendar day and less than 12 hours after expiry.
- From 12 hours after expiry, the fee must be paid before the extension goes through. It can be paid from the deposit.
- Extensions are limited to 28 days at a time.
- Mileage is entered with commas (24,676).
- The extend form shows the start and new end times on separate, aligned rows.

## Phase 4 — Home, mobile, legal and footer

- The home page watermark is lighter.
- On small phones, "EXTRAORDINARY." fits the screen, the three hero buttons stack full width, and the logo gets room.
- Phones get a sticky bottom bar with Book and My Rentals.
- The banner reads "Own a fleet. Earn with BEST." with a fleet or luxury car image.
- The cookie notice becomes a slim bar at the bottom.
- /terms, /cancellation and /privacy get their own pages, linked from the footer.
- The Privacy Policy becomes a full DRAFT for you to finalize. It covers what is collected (including SSN, license and bank statements), how it is used and shared, how long it is kept, security, user rights including California (CCPA), and contact details. The purchase form's checkbox links to it.
- The footer phone number and hours appear on every page.

## Phase 5 — Purchase / Credit App

- The long form becomes steps, with a progress bar, Back and Next buttons, and checks on each step.
- The two "State" fields are renamed "Address State" and "Driver's License State".
- The upload buttons are cleaner and show the chosen file's name.

## Phase 6 — Admin

- Every admin tab and Rentals sub-tab gets its own web address, so it can be bookmarked and refreshed. Panels show loading placeholders and remember their data.
- **Bookings**
  - A red Overdue badge shows the hours late and the fee due. Overdue gets its own filter.
  - Pending bookings more than 24 hours past their start date are marked Expired, with a "Clear expired" button.
  - Mark Returned opens a form: return time, odometer, fuel, damage notes and photos, late fee (calculated, editable), and deposit kept or refunded. Saving marks the booking Completed and the car Available.
  - Each booking's total is recalculated from the car's rates, with line items shown. Bookings whose saved total doesn't match are flagged.
- **Vehicles**
  - The vehicle list shows a photo, status, and day, week and month rates.
  - Status updates from bookings automatically, with a manual override.
  - New Hourly Rate field, defaulting to day rate ÷ 24.
  - Optional monthly rate autofill: our monthly payment + $752, editable per car.
  - Warnings when the weekly or monthly rate is higher than the day rate allows, or when rates look reversed.
- **Credit apps**
  - Date of birth, license number and SSN last 4 are hidden behind Reveal. Each reveal is logged with the admin and the time.
  - Fields get readable labels, empty sections are hidden, and self-employed details show when they apply.
- **Users and safety**
  - Admin accounts can't be deactivated or deleted.
  - Bookings, users and applications get a Test flag, and test records are hidden unless "Show test data" is on.
- **Earnings** opens on the current pay period.

## Phase 7 — Notifications

Emails, plus texts if text messaging is set up, for:

- Booking confirmed
- 24-hour and 2-hour return reminders
- Late notice when the grace period ends
- Extension receipt with the Statement of Permissive Member PDF attached
- Notify Me: car available
- Credit app status changed

## Technical details

- Pricing, late-fee, fee and availability rules live in shared files under src/lib, mirrored in the rental-booking and rental-admin edge functions. Totals stay server-authoritative, and each rule gets tests.
- New columns:
  - vehicles: hourly_rate, vehicle_type, monthly_markup
  - rental_bookings: returned_at, return_odometer, fuel_level, damage_notes, late_fee, is_test
  - Test flags on the users and purchase-application tables
- A new service-role-only credit-app reveal log table records each reveal.
- The automatic Expired marking and return reminders run on the existing scheduled server route.
- Admin addresses use TanStack child routes (/admin/$tab/$sub). Each route renders only an Outlet, following the existing rule.
- Credit app reveals and test flags go through the admin-only edge functions.
- Signed-in admin and renter pages can't be fully tested here. Admin flows are checked with sample data in the preview.  
make sure this plan fits the entire structure. if something does not fit fix it at your best discretion