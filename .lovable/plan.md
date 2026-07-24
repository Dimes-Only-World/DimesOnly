## Goal
Give you one bash script you can run locally that creates a Sandbox product + all 8 recurring billing plans in your PayPal Sandbox account and prints the `P-...` IDs, ready to paste into your Supabase secrets (overwriting the current Live values shown in your screenshots).

## Why this is needed
Your screenshots show all 8 `PAYPAL_*_PLAN_ID` secrets were last updated **26 Jan 2026** — those are your Live plan IDs. `PAYPAL_ENVIRONMENT` was flipped to `sandbox` on **23 Jul 2026** and `PAYPAL_CLIENT_ID`/`SECRET` on **24 Jul 2026**. PayPal Sandbox and Live are fully separate systems, so Live `P-...` plan IDs return "resource not found" when called against `api-m.sandbox.paypal.com`, which is what's producing the non-2xx from `create-paypal-subscription`. New Sandbox plan IDs must replace them.

## Prerequisites you gather once (5 min)
1. **Sandbox Business account** (Developer Dashboard → Testing Tools → Sandbox Accounts). Note its email.
2. **Sandbox REST app** owned by that same business account (Apps & Credentials → Sandbox → your app). Copy its Client ID + Secret.
   - These must match the account that will own the plans, or the plans won't resolve for your edge functions.
3. Confirm this is the same Client ID/Secret currently stored in `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`. If not, we'll update those in Step 3 below.

## Deliverable (single file)
`scripts/create-paypal-sandbox-plans.sh` — a bash script that:
1. Reads `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` from env vars (Sandbox app credentials).
2. Hits `https://api-m.sandbox.paypal.com`.
3. `POST /v1/oauth2/token` → gets an access token (fails fast with a clear message if credentials are wrong).
4. `POST /v1/catalogs/products` once → creates "Dimes Only Memberships" (SERVICE / DIGITAL). Skips if `PRODUCT_ID` env var is passed (re-run safety).
5. `POST /v1/billing/plans` eight times, one per SKU.
6. `POST /v1/billing/plans/{id}/activate` on each.
7. Prints, at the end, a ready-to-paste block:
   ```
   PAYPAL_SILVER_MONTHLY_PLAN_ID=P-XXXX
   PAYPAL_SILVER_YEARLY_PLAN_ID=P-XXXX
   PAYPAL_GOLD_MONTHLY_PLAN_ID=P-XXXX
   PAYPAL_GOLD_YEARLY_PLAN_ID=P-XXXX
   PAYPAL_DIAMOND_MONTHLY_PLAN_ID=P-XXXX
   PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID=P-XXXX
   PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID=P-XXXX
   PAYPAL_ELITE_MONTHLY_PLAN_ID=P-XXXX
   ```

Only dependencies: `curl` and `jq` (both standard on macOS/Linux; script will print an install hint if `jq` is missing).

## Default plan definitions the script will create
Please confirm or correct these — they'll be baked into the script:

```text
Silver Monthly            $11.99  / month,  infinite cycles
Silver Yearly             $119.00 / year,   infinite cycles
Gold Monthly              $24.99  / month,  infinite cycles
Gold Yearly               $249.00 / year,   infinite cycles
Diamond Monthly           $49.99  / month,  infinite cycles
Diamond Yearly Full       $499.00 / year,   infinite cycles       (one payment upfront, then renews yearly)
Diamond Yearly Split      $49.99  / month,  12 cycles then stop   (12-month installment)
Elite Monthly (Business)  $1250   / month,  12 cycles then stop   (with $250 setup fee on first payment)
```

If any of these prices/intervals are wrong, tell me the correct ones before I generate the script.

## How you use it (after I generate it in build mode)
1. `export PAYPAL_CLIENT_ID=<sandbox client id>`
2. `export PAYPAL_CLIENT_SECRET=<sandbox client secret>`
3. `bash scripts/create-paypal-sandbox-plans.sh`
4. Copy the 8 printed `P-...` values into Supabase → Project Settings → Secrets (overwrite each one).
5. Confirm `PAYPAL_ENVIRONMENT=sandbox` (already set), and confirm `PAYPAL_CLIENT_ID`/`SECRET` are the Sandbox app's (already updated 24 Jul per your screenshot).
6. Edge functions auto-redeploy; retry the $11.99 subscription — the non-2xx should be gone.

## Going back to Live later
Same script, one URL constant swapped to `https://api-m.paypal.com`, run with Live app credentials. Or keep both sets of plan IDs saved somewhere and swap the 8 secrets + `PAYPAL_ENVIRONMENT` when going live.

## Out of scope
- No edge function or UI code changes.
- No changes to your existing Live plan IDs (they'll simply be overwritten in Supabase secrets — save them elsewhere first if you want them back later).

Confirm the price table above (or send corrections) and I'll switch to build mode and drop the script in.