## Switch frontend PayPal SDK to Live (via paypal-config)

### Change
Rewrite `src/main.tsx` so the PayPal JS SDK loads its client ID from the existing `paypal-config` edge function instead of the hardcoded sandbox value on line 8. The edge function already returns `PAYPAL_CLIENT_ID` from Supabase secrets, so the SDK will automatically match whatever `PAYPAL_ENVIRONMENT` is set to (currently `live`).

### How it works
- On app boot, call `supabase.functions.invoke('paypal-config')`.
- Show the existing "Loading..." fallback while the client ID is fetched (fast, one-time).
- Mount `<PayPalScriptProvider>` with the returned `clientId`.
- If the fetch fails, render the app without the PayPal SDK (buttons won't work, but the rest of the app still loads) — same behavior as the existing error boundary.

### Still required from you (I can't do these)
1. **Create Live subscription plans** in the PayPal Developer dashboard under your Live REST app, then update these 8 secrets with the new Live `P-...` IDs:
   - `PAYPAL_SILVER_PLUS_PLAN_ID`
   - `PAYPAL_GOLD_PLAN_ID`
   - `PAYPAL_DIAMOND_PLAN_ID`
   - `PAYPAL_DIAMOND_PLUS_PLAN_ID`
   - `PAYPAL_ELITE_PLAN_ID`
   - `PAYPAL_ELITE_INSTALLMENT_PLAN_ID`
   - (plus the remaining 2 — I'll confirm exact names once in build mode)
2. Confirm the Live webhook URL points at `https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/paypal-webhook`.

### Verify after the change
- Load a checkout page and confirm the PayPal button renders with your **Live** client ID (check the `<script src="https://www.paypal.com/sdk/js?client-id=...">` in DevTools Network tab).
- Attempt a small subscription — should redirect to `paypal.com` (not `sandbox.paypal.com`).
- Check `create-paypal-subscription` edge function logs: should see a successful token exchange instead of `invalid_client`.
