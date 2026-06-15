## Problem

In `supabase/functions/process-tip/index.ts`, every username lookup against `users` uses `.eq("username", ...)` which is case-sensitive. But the project stores `users.username` in lowercase while `users.referred_by` is stored with original casing (e.g. `referred_by = "PersianDesert"` vs `username = "persiandesert"`).

Result for the most recent tip (verified in DB):
- Performer's referrer is not found → `refCommission = 0` → the girl who referred the performer does **not** get her 10% commission, no `commission_payouts` row, no `referral_fees` increment, no `weekly_earnings` row.
- The same failed lookup removes the `grand_prize_dime_referrer`, `second_place_referrer`, and `second_place_super_referrer` ticket slots from `jackpot_tickets`.
- The tipper's own `grand_prize_tipper` tickets ARE inserted, but because the whole referrer chain silently fails, the user perceives "tickets missing".

## Fix

Make every `users` lookup in `supabase/functions/process-tip/index.ts` case-insensitive:

1. Replace `.eq("username", cleaned)` in `fetchUserByUsername` with `.ilike("username", cleaned)` (or `.eq("username", cleaned.toLowerCase())` — pick one consistent style).
2. Apply the same change to the direct referrer lookup around line 286 (`.eq("username", referrerUsername)`).
3. Apply the same change to the `tipped_username` lookup (line 220) and any other `.eq("username", ...)` in this file, so a tip submitted with non-lowercase performer name still resolves.
4. Keep `referrerUsername` value as written for storage in `tips`, `payments`, `tips_transactions` (no behavior change there), but use the resolved DB row's `id` and canonical `username` for downstream logic.

## Verification

- Replay an existing failing tip scenario by manually invoking the function with `tipped_username=yofav.samiya`, observe 6 distinct `source` slots in `jackpot_tickets`, a non-zero `referrer_commission` on the `tips_transactions` row, and a `commission_payouts` row for the performer's referrer.
- Confirm tipper still sees their `grand_prize_tipper` tickets in `UserJackpotTab` (no code change needed there).

## Out of scope

- No DB schema or RLS changes.
- No UI changes.
- Historical broken tips are not back-filled (can be done separately if requested).
