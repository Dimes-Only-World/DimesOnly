## Diagnosis

Confirmed via `fetch_secrets`: the two new plan IDs are **not yet in Supabase**. Only `PAYPAL_ELITE_MONTHLY_PLAN_ID` exists. That's why:

- **Elite — Annual ($10,000/yr)** → `create-paypal-subscription` fails (missing `PAYPAL_ELITE_YEARLY_PLAN_ID`)
- **Elite Plus — 12-Month Plan ($1,500 today)** → fails (missing `PAYPAL_ELITE_PLUS_INSTALLMENT_PLAN_ID`)

Both return non-2xx from the edge function, producing the "Payment error" toasts in your screenshots.

## Plan

### 1. You create the two plans in PayPal (Live)
In PayPal Developer Dashboard → your Live REST app → Catalog / Subscription Plans, create:

**a) Elite Annual**
- Billing cycle: 1 year, infinite
- Price: $10,000 USD
- No setup fee, no trial
- Copy the plan ID (starts with `P-`)

**b) Elite Plus 12-Month Installment**
- Billing cycle: 1 month, **fixed 12 cycles**
- Regular price: $1,250 USD
- **Setup fee: $250** (charged with first payment → first charge = $1,500, then 11 × $1,250)
- Copy the plan ID (starts with `P-`)

### 2. I open a secure form to save both IDs
Once you have both `P-...` IDs, I'll call `add_secret` for:
- `PAYPAL_ELITE_YEARLY_PLAN_ID`
- `PAYPAL_ELITE_PLUS_INSTALLMENT_PLAN_ID`

Supabase auto-redeploys edge functions when secrets change — no code changes needed. Both checkout buttons will start working immediately.

### 3. Verify
- Test Elite Annual → expect PayPal approval flow at $10,000/yr
- Test Elite Plus Monthly → expect first charge $1,500, then $1,250 × 11
- Check `create-paypal-subscription` logs to confirm no `invalid_client` / missing-plan errors

## Notes
- Both plans must be created under the **same Live REST app** as your `PAYPAL_CLIENT_ID`, otherwise PayPal returns `RESOURCE_NOT_FOUND`.
- Elite Plus Lifetime ($15,000 one-time) needs no plan ID — it uses a one-time order and already works.
