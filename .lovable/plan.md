## Split Elite into Elite and Elite Plus tiers

Restructure the current single "Elite" offering into **two distinct tiers**, each with a monthly and a yearly option.

### Pricing

**Elite**
- Monthly: **$861.75/mo** (recurring subscription — charged every month)
- Yearly: **$10,000/year** (recurring annual subscription — charged once a year)

**Elite Plus**
- Monthly: **12-Month Installment Plan** — first payment **$1,500** ($1,250 + $250 setup fee), then **$1,250/mo × 11** (charged every month, auto-billed). Total **$15,250** over 12 months.
- Yearly: **$15,000 one-time payment** (lifetime, single charge)

### Frontend changes

**`src/pages/Upgrade.tsx`**
- Replace the single `elite` package with two: `elite` and `elite_plus`.
- `displayPrice`:
  - `elite` → yearly `$10,000`, monthly `$861.75`
  - `elite_plus` → yearly `$15,000`, monthly `$1,500` (first-payment label with note "$1,250/mo × 11 after")
- Route to `/elite?tier=elite&cadence=…` or `/elite?tier=elite_plus&cadence=…`.

**`src/pages/Elite.tsx`**
- Read `tier` (`elite` | `elite_plus`) and `cadence` (`monthly` | `yearly`) from query params.
- Amount matrix + PayPal call:
  - `elite` + monthly → `create-paypal-subscription`, $861.75/mo (uses existing `PAYPAL_ELITE_MONTHLY_PLAN_ID`)
  - `elite` + yearly → `create-paypal-subscription`, $10,000/yr (needs new `PAYPAL_ELITE_YEARLY_PLAN_ID`)
  - `elite_plus` + yearly → `create-paypal-order`, $15,000 one-time (`payment_type: "elite_plus_lifetime"`)
  - `elite_plus` + monthly → `create-paypal-subscription`, recurring **$1,250/mo for 12 cycles** with a **$250 setup fee** on the first payment (uses new `PAYPAL_ELITE_PLUS_INSTALLMENT_PLAN_ID`). PayPal auto-bills each month; membership stays active as long as the subscription is active.
- Update titles/descriptions and checkout copy per selection. Keep 50-seat cap combined across Elite + Elite Plus (unless you tell me to split it).

### Backend changes

**`supabase/functions/create-paypal-subscription/index.ts`**
- Remove the guard blocking `elite` + `yearly`.
- Add plan lookups: `PAYPAL_ELITE_YEARLY_PLAN_ID` for Elite yearly, `PAYPAL_ELITE_PLUS_INSTALLMENT_PLAN_ID` for Elite Plus monthly installment.
- Update the missing-plan error hints.

**`supabase/functions/start-membership-paypal/index.ts`**
- Add description for `elite_plus` lifetime path ($15,000 one-time).

**`supabase/functions/membership-webhook`**
- Recognize `elite_plus` and `elite_plus_installment` as valid tier upgrades so status flips correctly on approval / each installment. Existing 20% direct + 10% upline referral commission logic applies automatically to both tiers on each successful charge.

### Still required from you (I can't do these)

Create the following **Live subscription plans** in the PayPal Developer Dashboard under your Live REST app, then save the `P-…` IDs as Supabase secrets:

1. **Elite Yearly** — $10,000, billing cycle: **Yearly**, total cycles: **Infinite** → `PAYPAL_ELITE_YEARLY_PLAN_ID`
2. **Elite Plus Installment** — $1,250/mo, billing cycle: **Monthly**, total cycles: **12**, **setup fee $250** applied to first payment → `PAYPAL_ELITE_PLUS_INSTALLMENT_PLAN_ID`
3. Confirm existing `PAYPAL_ELITE_MONTHLY_PLAN_ID` is set to **$861.75/mo** (update or recreate if the current plan is a different amount).

Elite Plus **Yearly** ($15,000 lifetime) is a one-time order — no plan ID needed.

### Verify after build

- `/upgrade` shows two cards: **Elite** ($10,000/yr or $861.75/mo) and **Elite Plus** ($15,000 lifetime or $1,500 first / $1,250/mo × 11).
- Elite monthly → PayPal subscription at $861.75/mo.
- Elite yearly → PayPal subscription at $10,000/yr.
- Elite Plus yearly → PayPal one-time $15,000 order.
- Elite Plus monthly → PayPal subscription: $1,500 first month ($250 setup + $1,250), then $1,250/mo auto-billed for 11 more months, then ends.
- Seat cap enforced.

### Open question

Should the 50-seat cap be **combined** across Elite + Elite Plus, or **separate caps per tier**? Defaulting to combined.
