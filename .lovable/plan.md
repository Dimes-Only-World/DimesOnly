## Goal

Make **Business Owner** a full first-class registration path:
- Dedicated explainer video during registration.
- Dedicated profile + home/dashboard video.
- Starts as a free "Silver-equivalent" browsing account with an **Upgrade to Elite — $15,000** CTA.
- Elite for Business Owners is its own pool: **100 lifetime seats**.
- Payment: one-time **$15,000** or **12-month plan** ($1,500 first month including $250 fee, then $1,250 × 11 = $15,250 total). Access granted as soon as the first payment clears.
- Admin can change every Business Owner video from the existing Banner Videos tab.

## 1. Database (single migration)

**users — new columns**
- `is_business_owner boolean default false`
- `business_owner_elite_active boolean default false`
- `business_owner_elite_seat_number integer`
- `business_owner_elite_granted_at timestamptz`

**New table `business_owner_elite_seats`** (mirrors `elite_memberships` pattern)
- `user_id`, `status` (`monthly_active` | `lifetime`), `months_paid_count`, `started_at`, `lifetime_granted_at`, `seat_number`, timestamps.
- GRANTs: `authenticated` select-own; `service_role` ALL.
- RLS: select-own + service_role ALL.

**New view `business_owner_elite_seat_stats`** (mirrors `elite_seat_stats`)
- `seats_max = 100`, `seats_taken`, `seats_available`. `security_invoker = false`. Public select.

No `page_videos` rows are seeded — admins fill them in.

## 2. Edge Functions

**`start-business-owner-elite-paypal`** (new, modeled on `start-membership-paypal`)
- Inputs: `user_id`, `plan` ('lifetime' | 'installment'), `phone_number`, `payment_method` ('paypal' | 'paypal_card' | 'paylater'), `return_url`, `cancel_url`.
- Validates BO seat cap (`< 100`) before creating order.
- Lifetime → one-time $15,000 PayPal order.
- Installment → create `membership_upgrades` row (`upgrade_type='business_owner_elite_installment'`, `installment_plan=true`, `installment_count=12`, `payment_amount=15250`). First charge $1,500 now, schedule 11 × $1,250 in `installment_payments`.
- Uses Card Redirect pattern for cards (avoids 422).

**Extend `paypal-webhook`**
- On success of `business_owner_elite_lifetime` OR first installment of `business_owner_elite_installment`:
  - Re-check seat cap server-side.
  - Insert `business_owner_elite_seats` row with next seat_number.
  - Update `users`: `business_owner_elite_active=true`, `business_owner_elite_seat_number`, `business_owner_elite_granted_at`, `membership_tier='business_owner_elite'`, `membership_type='Business Owner Elite'`.

## 3. Registration (`RegistrationFormFields.tsx`)

The third radio "Business Owner" already exists. Wire it up:
- When `gender === 'business_owner'`: hide female user-type selector and male explainer; show new `register_business_owner` explainer video via `usePageVideo`.
- On submit: set `user_type='business_owner'`, `is_business_owner=true`, `membership_tier='silver'` (free browsing baseline).
- Post-register redirect: `/dashboard` (not the gender-specific events page).

## 4. Profile page (`src/pages/Profile.tsx`)

For any profile where `is_business_owner === true`:
- Reuse the existing profile shell (same layout as Male/Female/Stripper/Exotic — no behavior changes for other types).
- Add a new top section above the hero:
  - `profile_business_owner_banner` video via `usePageVideo`.
  - If the viewer is the profile owner AND `business_owner_elite_active === false`: prominent **"Upgrade to Elite — $15,000"** button → `/business-owner-elite`.
  - If active: show **"Elite Member · Seat #N"** badge instead.

## 5. Dashboard / Home (`UserDashboard.tsx`, `DashboardBanner.tsx`, `Index.tsx`)

When current user `is_business_owner === true`:
- Swap hero/banner to new `dashboard_business_owner` page_video.
- Show the Elite upgrade CTA (same target route) when not yet Elite.
- Show "Elite Member" badge with seat # once active.

## 6. New page `/business-owner-elite`

Modeled on `src/pages/Elite.tsx`:
- Fetches `business_owner_elite_seat_stats` (100 cap, real-time).
- Two cards:
  - **One-Time Lifetime — $15,000** (PayPal / Pay Later / Card Redirect).
  - **12-Month Plan** — copy: "$1,500 today (includes $250 processing fee), then $1,250/mo for 11 months. Total $15,250. Full Elite access starts immediately."
- Each card uses `PaymentMethodSelector` and calls `start-business-owner-elite-paypal`.
- Wrapped in `AuthGuard`; route registered in `App.tsx`.

## 7. Admin (`AdminBannerVideoTab.tsx`)

Append to `PAGE_VIDEO_CONFIG`:
- `register_business_owner` — "Registration – Business Owner Explainer"
- `dashboard_business_owner` — "Business Owner Home / Dashboard"
- `profile_business_owner_banner` — "Business Owner Profile Top Banner"

Admin can paste any video URL today; placeholder works.

## 8. Access control (`ContentAccessControl.tsx` / `AppContext.tsx`)

Add derived `hasBusinessOwnerElite = user?.business_owner_elite_active === true`.
- When true: treat user as full-access viewer across all tiers (free / silver / gold / diamond / diamond-plus).
- No earning/tipping/jackpot/ratings rights are added — view-only privilege escalation.

## Out of scope (untouched)

- Existing performer Elite (50 seats / $10K) flow.
- Earnings, payouts, jackpot, ratings for Business Owners.
- Male / Female / Stripper / Exotic registration paths.

## Tech notes

- Seat cap enforced server-side in edge function + webhook (`COUNT(*) FROM business_owner_elite_seats WHERE status IN ('monthly_active','lifetime') < 100`).
- Use `bcryptjs` from `esm.sh` where hashing is touched (none expected here).
- `verify_jwt = false` only where required; checkout function should require auth.
- PayPal live mode; Card Redirect pattern per project memory.
- All new public-schema objects ship with explicit `GRANT`s.
