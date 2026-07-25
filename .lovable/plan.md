## Goal
Add a 5th "Events" tab to the user Earnings page and pay event referral commissions using the same percentages already used for referrals on tips/memberships:

- 20% to the buyer's direct referrer
- 10% to the upline referrer (who referred the direct referrer)
- Base = net after PayPal fees ($0.50 flat + 2.75%)

Currently, event ticket purchases pay only the event host — no referral commission is written to the buyer's referrer chain — so the new tab has nothing to display until we also wire that up.

---

## Backend — pay event referral commissions

Edit `supabase/functions/capture-event-payment/index.ts` and `supabase/functions/process-card-event-payment/index.ts`:

After the `event_transactions` insert (and after existing host earnings allocation), call a new shared helper `awardEventReferralCommissions(supabase, buyerId, grossAmount, eventId, transactionId)` that:

1. Loads the buyer's `referred_by` from `public.users`; exits if empty or `"company"`.
2. Resolves the direct referrer by case-insensitive username lookup; exits if not found.
3. Computes:
   - `net = gross - (0.50 + gross * 0.0275)`
   - `direct = net * 0.20`
   - `upline = net * 0.10`
4. Inserts idempotent rows in `public.payments`:
   - Direct: `payment_type = 'event_referral_commission'`, keyed by `(user_id, payment_type, event_id)` via `paypal_transaction_id = eventTx.id` for uniqueness.
   - Upline (only if direct referrer's `referred_by` exists and ≠ "company"): `payment_type = 'event_upline_referral_commission'`.
5. Upserts the same amounts into `public.weekly_earnings` for the current Mon–Sun week (mirroring `membership-webhook` logic).

Also add the same call inside `supabase/functions/paypal-webhook/index.ts` where event payments are captured (around line 377) so PayPal webhook-driven captures pay commissions too.

The helper lives once — either inlined identically in each function or as a small file each function imports via a relative path.

---

## UI — new "Events" tab

Edit `src/components/UserEarningsTab.tsx`:

1. Change `TabsList` from `sm:grid-cols-4` to `sm:grid-cols-5` and add a new `TabsTrigger value="events"` labeled "Events" (Calendar icon), styled identically to the existing yellow-active triggers.
2. Add state `eventEarnings: EventEarning[]` and a `fetchEventEarnings(userId)` that queries `public.payments` for rows where `user_id = current user` and `payment_type IN ('event_referral_commission', 'event_upline_referral_commission')`, joined/enriched with the event name via a follow-up lookup on `event_transactions → events` (using `paypal_transaction_id` → `event_transactions.id`).
3. Reuse the current Referrals tab's filter surface (pay-period / date-range selects already exposed via `saveReferralEarningsFilters`) so the Events tab honors the same active filter — matches the "exact same allocation logic as in referrals" phrasing.
4. Render a new `<TabsContent value="events">` with:
   - Summary card: total event referral earnings + count.
   - List: date, event name, buyer username, role badge ("Direct 20%" / "Upline 10%"), gross ticket amount, and commission earned. Empty state mirrors the Referrals tab.
5. Include event referral totals in the header stat cards so the "Total Referral Earnings" card reflects both membership/tip and event commissions (single source of truth: sum of all `*_referral_commission` payment types).

No changes to the tab order for the other four tabs; Events is appended as the 5th.

---

## Verification

1. Type-check with `tsgo` (auto-run) after edits.
2. Manually test in preview by simulating an event purchase where the buyer has a 2-level referral chain, then confirm two `payments` rows land and both users see the row in their Earnings → Events tab.

---

## Technical Details

- Idempotency key for event commissions: `(user_id, payment_type, paypal_transaction_id=event_transaction_id)` — matches the pattern used for membership and subscription commissions and prevents double-pay on webhook retries.
- Fee model ($0.50 + 2.75%) mirrors the just-shipped `processMembershipReferralCommissions` helper so every referral surface uses one net-calculation formula.
- No DB migration needed — `payments`, `event_transactions`, and `weekly_earnings` already exist with the right columns; we only add new `payment_type` string values.
- Files touched: `src/components/UserEarningsTab.tsx`, `supabase/functions/capture-event-payment/index.ts`, `supabase/functions/process-card-event-payment/index.ts`, `supabase/functions/paypal-webhook/index.ts`.
