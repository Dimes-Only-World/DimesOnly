## Fix: "Could not verify payment" on membership upgrade return

### Problem
After PayPal redirects back to `/payment-return`, `PaymentStatusHandler` queries `membership_upgrades` directly with the anon key. `sessionStorage` can be wiped during the redirect (new tab/incognito), and the fallback lookup by PayPal token is blocked by RLS for custom-auth admin sessions (no `auth.uid()`). Result: row exists but client can't see it → "Could not verify payment."

### Changes

1. **`supabase/functions/start-membership-paypal/index.ts`**
   - Append `upgrade_id=<id>` to the PayPal `return_url` so it always survives the round-trip, independent of `sessionStorage`.

2. **New edge function `supabase/functions/verify-membership-upgrade/index.ts`**
   - Uses service role to bypass RLS.
   - Accepts `upgrade_id` and/or PayPal `token` (order id).
   - Looks up the `membership_upgrades` row; if still pending, calls the existing activation path (same logic as `membership-webhook`) to capture/activate.
   - Returns `{ status, membership, upgrade_id }`.

3. **`src/components/PaymentStatusHandler.tsx`**
   - Replace direct `supabase.from('membership_upgrades')` lookup with a call to `verify-membership-upgrade`, passing `upgrade_id` (from URL or sessionStorage) and `token` from the PayPal return URL.
   - Show success/failure based on the edge function response.

### Out of scope
- No DB schema changes, no RLS changes, no UI redesign.
- PayPal live-mode flow untouched aside from the return_url query param (backward compatible).
