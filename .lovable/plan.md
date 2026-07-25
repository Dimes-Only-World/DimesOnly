## Fix membership referral commissions (20% direct + 10% upline) across all tiers

### Diagnosis
Audit of `supabase/functions/*` found the commission split is applied inconsistently. Only Silver Plus, Diamond Plus, and Elite Plus (full + installments) run 20/10 in the one‑time/`membership-webhook` path. Subscription tiers run in `paypal-subscription-webhook` but with a *different* fee model (1.5% vs 2.75%) and a "reduce to 10/5 if the direct referrer is on the free tier" rule that doesn't exist in the other path. Plain **Silver ($49.99)**, **Gold**, and **Diamond one‑time** upgrades have **no commission code path at all**, and `verify-paypal-subscription` (client‑poll fallback) activates the tier without ever paying commissions.

Tonya Price → Gold: because the Gold one‑time branch in `membership-webhook` has no `if (tier === "gold")` commission block, `dragontan` (20%) and `bonesdrl` (10%) were never credited when the webhook activated her upgrade.

### Changes

1. **Extract a single shared commission helper** in `supabase/functions/membership-webhook/index.ts`:
   - `processMembershipReferralCommissions(supabase, upgrade, grossAmount, { tierLabel, paymentTypePrefix })` that mirrors the Elite Plus helper: look up `users.referred_by` from DB (never client), then the direct referrer's `referred_by` for upline, compute 20% direct + 10% upline off net-after-PayPal-fees, insert two `payments` rows tagged `${paymentTypePrefix}_referral_commission` / `_upline_referral_commission`, credit `users.referral_fees`/`tips_earned` via existing RPCs, and update `weekly_earnings`. Idempotency guarded by `paypal_payment_id` + payment_type.

2. **Wire the helper into every missing tier branch** in `activateMembership()`:
   - `silver` (one-time $49.99)
   - `gold` (one-time)
   - `diamond` (one-time)
   
   Silver Plus / Diamond Plus / Elite Plus already have blocks — refactor them to call the shared helper so all paths use the same 20/10 math and the same PayPal fee base (`$0.50 + 2.75%`). Keep Silver Plus's configurable rate override (`referral_fees.silver_plus`) as an optional argument for backward compatibility, but default to 20/10.

3. **Align `paypal-subscription-webhook`** (`supabase/functions/paypal-subscription-webhook/index.ts:108‑216`):
   - Change PayPal fee model to `$0.50 + 2.75%` to match the one-time path (single source of truth).
   - Remove the "reduce to 10%/5% when direct referrer is on free tier" downgrade — always pay 20% direct + 10% upline per user's requirement.
   - Keep the once-per-transaction idempotency guard.

4. **Close the `verify-paypal-subscription` gap**:
   - After it upserts `subscriptions` and sets `users.membership_tier`, invoke the same commission helper (idempotent via `paypal_transaction_id`) so a missed/delayed `BILLING.SUBSCRIPTION.ACTIVATED` webhook can't cause commissions to be silently skipped.

5. **Backfill Tonya Price → Gold**: run a one-off insert (via the insert tool, after code ships) that:
   - Locates the completed Gold upgrade payment for Tonya Price,
   - Inserts the two missing `payments` rows (20% to `dragontan`, 10% to `bonesdrl`) using the same net-after-fees math,
   - Credits both users' `referral_fees` and the current-week `weekly_earnings`.
   Only runs if no matching commission rows already exist (idempotent WHERE NOT EXISTS).

### Technical details

- All referrer/upline lookups stay server-side against `public.users` — no client-provided `referred_by`.
- Rates: `DIRECT = 0.20`, `UPLINE = 0.10`. Base = `gross - (0.50 + gross * 0.0275)`, floored at 0.
- Payment type strings (namespaced by tier so admin reports stay readable):
  - `silver_referral_commission`, `silver_upline_referral_commission`
  - `gold_referral_commission`, `gold_upline_referral_commission`
  - `diamond_referral_commission`, `diamond_upline_referral_commission`
  - (existing) `silver_plus_*`, `diamond_plus_*`, `elite_plus_*`, `subscription_*`
- Idempotency: existing `payments` unique lookup by `(user_id, paypal_payment_id, payment_type)` before insert.
- No schema changes required — reuses `payments`, `weekly_earnings`, and the existing `increment_referral_fees` / `increment_tips_earned` / `increment_weekly_referral_earnings` RPCs.

### Verification after build
- Query recent completed `membership_upgrades` for Gold/Silver/Diamond one-time and confirm two `payments` rows exist per upgrade with the correct 20%/10% amounts.
- Confirm Tonya Price's Gold upgrade now has commission rows crediting `dragontan` and `bonesdrl`, and both users' `referral_fees` and this week's `weekly_earnings.referral_earnings` increased by the expected amounts.