## Goal

Two related changes on the membership upgrade experience:

1. **Grey out lower tiers** on `src/pages/Upgrade.tsx` — any package at or below the user's current tier renders in the same locked state as the current plan.
2. **Allow subscription cancellation** — the user can cancel a paid PayPal subscription from the Upgrade page. Cancellation stops future billing but keeps all tier benefits active until the current period ends; only then does the tier revert to Silver (the platform default).

## Part 1 — Grey out lower tiers

Ranks (low → high) applied to `userData.membership_tier` (lowercased):

```text
free / ""     → 0
silver        → 1
silver_plus   → 2   (lifetime variant of silver)
gold          → 3
diamond       → 4
diamond_plus  → 5   (lifetime variant of diamond)
elite         → 6
elite_plus    → 7
```

Package IDs map to: silver=1, gold=3, diamond=4, elite=6, elite_plus=7.

In `src/pages/Upgrade.tsx`, in the `packages.map(...)` block (~lines 265–339):

- Compute `currentRank` and `pkgRank` from the map; unknown → 0.
- `isCurrent = currentRank === pkgRank`
- `isBelow = pkgRank < currentRank` (new — the grey-out rule)
- Keep `isSilverPlusLock` / `isDiamondPlusLock` so the "Lifetime Plus" copy still renders for those two cards.
- `isLocked = isCurrent || isBelow || isSilverPlusLock || isDiamondPlusLock`
- Card / button already react to `isLocked` (opacity, cursor, disabled, no-op onClick).
- Extend the button label ternary: current → "Current plan"; SilverPlus/DiamondPlus lock → existing lifetime copy; `isBelow` → "Included in your plan"; else "UPGRADE NOW".
- Header badge: when `isBelow && !isCurrent && !isSilverPlusLock && !isDiamondPlusLock`, show a neutral gray "Included" badge.

No pricing, routing, or checkout changes.

## Part 2 — Cancel subscription

### Behavior

- Cancellation only applies to subscription tiers backed by a PayPal recurring plan (row exists in `public.subscriptions` for the user with `status = 'active'`). Lifetime purchases (silver_plus, diamond_plus, elite_plus lifetime, elite one-time) show no cancel action.
- Clicking "Cancel subscription" calls PayPal to cancel the billing agreement, then marks the local subscription row `status = 'cancelled'` and stamps `membership_expires_at = next_billing_time` (fall back to `now() + 30 days` if `next_billing_time` is null).
- The user's `users.membership_tier` / `membership_type` are **not** changed at cancel time — benefits stay live until expiry.
- A background reconciliation (existing PayPal webhook path for `BILLING.SUBSCRIPTION.CANCELLED` / `BILLING.SUBSCRIPTION.EXPIRED` and a scheduled sweep of `subscriptions` where `status='cancelled' AND membership_expires_at <= now()`) downgrades the user to `silver` (default paid floor per project memory) once the paid period ends.

### UI

On `src/pages/Upgrade.tsx`, above the pricing grid, add a "Current subscription" panel that renders only when the user has a `subscriptions` row with `status IN ('active','cancelled')`:

- Active row: shows tier, cadence, "Next billing: {date}", and a red outline `Cancel subscription` button. Button opens a confirmation dialog explaining "You'll keep {tier} benefits until {membership_expires_at || next_billing_time}. After that your account returns to Silver."
- Cancelled row: shows "Cancellation scheduled — {tier} benefits active until {membership_expires_at}", no cancel button, and (later, out of scope for this change) a re-activate action.

The cancel action calls a new edge function and, on success, refetches user + subscription state and toasts "Subscription cancelled — benefits active until {date}".

### New edge function: `supabase/functions/cancel-paypal-subscription/index.ts`

- CORS + `verify_jwt = false` in code; validate the caller's Supabase JWT from the `Authorization` header (mirror the pattern in `verify-paypal-subscription`).
- Body (Zod): `{ subscription_row_id?: string }` — optional; when omitted, cancel the caller's newest `status='active'` subscription row.
- Steps:
  1. Load the target row from `public.subscriptions` via service role; verify `user_id === caller`.
  2. Get PayPal access token using `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (env base URL chosen by `PAYPAL_ENVIRONMENT` — same helper the other PayPal functions already use).
  3. `POST /v1/billing/subscriptions/{subscription_id}/cancel` with `{ reason: "User requested cancellation" }`. Treat HTTP 204 and "already cancelled" errors as success (idempotent).
  4. Update the row: `status = 'cancelled'`, `membership_expires_at = COALESCE(next_billing_time, now() + interval '30 days')`, `updated_at = now()`.
  5. Return `{ success: true, expires_at }`.
- No changes to the `users` row here.

### Webhook / expiry handling

In `supabase/functions/paypal-subscription-webhook/index.ts` (and `paypal-webhook/index.ts` if it also handles subscription events):

- On `BILLING.SUBSCRIPTION.CANCELLED`: mirror the same row update as the edge function above (idempotent) so PayPal-initiated cancels are captured.
- On `BILLING.SUBSCRIPTION.EXPIRED` (or when `membership_expires_at <= now()` reached via the sweep below): set the user's `membership_tier = 'silver'`, `membership_type = 'Silver'`, clear tier-specific flags for that subscription's tier only, and mark the subscription row `status = 'expired'`. Do not touch lifetime flags (`silver_plus_active`, `diamond_plus_active`, `business_owner_elite_active`).

Add a lightweight scheduled sweep — a new edge function `supabase/functions/subscriptions-sweep/index.ts` that:
- Selects `subscriptions` where `status='cancelled' AND membership_expires_at <= now()`.
- For each, downgrades the owning user as above and sets `status='expired'`.
- Intended to be triggered by an existing scheduled job (pg_cron or the platform's cron); wiring the schedule itself is out of scope for this plan and will be noted for the user to enable once the function is deployed.

### Data / migrations

No schema changes required — `public.subscriptions` already has `status`, `next_billing_time`, and `membership_expires_at`. No new columns, no new grants.

### Files touched

- `src/pages/Upgrade.tsx` — grey-out logic + Current Subscription panel + cancel dialog + call to the new edge function.
- `supabase/functions/cancel-paypal-subscription/index.ts` — new.
- `supabase/functions/paypal-subscription-webhook/index.ts` — extend event handling for CANCELLED/EXPIRED (idempotent).
- `supabase/functions/subscriptions-sweep/index.ts` — new, for time-based downgrade.

### Secrets

Uses existing `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT`, and `SUPABASE_SERVICE_ROLE_KEY`. No new secrets.

### Out of scope

- Re-activating a cancelled subscription before expiry.
- Prorated refunds.
- Cancelling installment/one-time purchases (Elite Plus 12-month installment, Elite Yearly one-time, Elite Lifetime) — those are not recurring PayPal subscriptions and the panel simply won't offer cancel for them.
