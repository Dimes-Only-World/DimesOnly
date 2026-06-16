# Override tips not appearing on "Tips Received"

## Root cause

`thetruth`'s overrides exist in `public.tips_transactions` (3 new rows on 6/16/2026, $0.94 each) — that's why "Pay Period History" correctly shows **Referrals: $2.82**.

But the "Tips Received" tab queries the same table with `.eq("referrer_username", userData.username)` and gets back nothing, because the table's SELECT RLS policy only lets the **tipper** or the **tipped user** read rows:

```
tips_transactions_select_own:
  tipper_user_id = auth.uid()
  OR tipped_user_id = auth.uid()
```

The **referrer** is not in that policy, so referrers are blocked from reading their own override rows. The only row that shows today is the 12/20/2025 one, because on that row `thetruth` was also the tipper, which satisfies the existing policy.

Pay Period History works because it reads from `payments` (different table, different RLS).

## Fix

Update the RLS SELECT policy on `public.tips_transactions` to also allow rows where the current user is the referrer. Match on `referrer_username` (case-insensitive) by looking up the caller's username in `public.users`.

### Migration

```sql
DROP POLICY IF EXISTS tips_transactions_select_own ON public.tips_transactions;

CREATE POLICY tips_transactions_select_own
ON public.tips_transactions
FOR SELECT
USING (
  tipper_user_id = auth.uid()
  OR tipped_user_id = auth.uid()
  OR LOWER(referrer_username) = LOWER((
    SELECT username FROM public.users WHERE id = auth.uid()
  ))
);
```

No other policies change. No code changes are required — the existing query in `UserEarningsTab.tsx` (lines 705–721) will start returning the 3 missing rows immediately, and `combinedTips` will render them as "Referral Tip" entries on the Tips Received tab.

## Verification

After the migration, reload Earnings → Tips Received as `thetruth`. Expected: 4 entries — the existing $0.44 from 12/20/2025 plus three new "Referral Tip" rows (gime, gime, latinastar) at $0.94 each on 6/16/2026, totaling $2.82 (matches Pay Period History).

## Out of scope

- PayPal sandbox/live credential issue from earlier (separate problem).
- Referrer-attribution logic in `process-tip` (already correct: uses performer's `referred_by`).
- No UI changes.
