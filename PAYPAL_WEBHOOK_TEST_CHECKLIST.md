# PayPal Webhook Test Checklist

Purpose: Validate that `supabase/functions/paypal-subscription-webhook/index.ts` receives, verifies, and processes events correctly.

## Prereqs
- `PAYPAL_ENVIRONMENT=sandbox`
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` set in Supabase secrets
- `PAYPAL_WEBHOOK_ID` set (from the PayPal webhook you created)
- Edge Function deployed: `paypal-subscription-webhook`
- Webhook URL in PayPal: `https://<project-ref>.functions.supabase.co/paypal-subscription-webhook`

## Steps (Simulator)
1. Login: https://developer.paypal.com → Dashboard → Webhooks → Simulator
2. Select your webhook (the URL above)
3. Choose event and send:
   - BILLING.SUBSCRIPTION.CREATED
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED
   - BILLING.SUBSCRIPTION.CANCELLED (optional)
4. Check responses:
   - Expect HTTP 200 for VERIFIED events
   - Expect HTTP 400 if verification fails

## What to verify in our app
- Logs in function should show: `PayPal verification_status: SUCCESS|VERIFIED`
- For PAYMENT.SUCCEEDED, the `public.subscriptions` row for that `subscription_id` updates:
  - `cycles_paid` increments by 1
  - `membership_expires_at` extended per cadence rules
  - `next_billing_time` set when provided

## Sample mapping notes
- `resource.id` or `resource.subscription_id` → `subscriptions.subscription_id`
- `resource.billing_info.next_billing_time` → `subscriptions.next_billing_time`
- `resource.billing_info.cycle_executions[*].cycles_completed` → used to compute progress (we also track `cycles_paid`)
- `resource.custom_id` (pattern: `${tier}_${cadence}_${billingOption}_user_${userId}`) → maps to `tier`, `cadence`, `billing_option`, `user_id`

## Troubleshooting
- 400 signature_verification_failed
  - Ensure `PAYPAL_WEBHOOK_ID` is set and matches the webhook in Dashboard
  - Confirm you’re using Sandbox webhook and Sandbox app credentials
- 200 but DB not updated
  - Check that a `subscriptions` row exists for the `subscription_id` (created on CREATED/ACTIVATED)
  - Verify RLS: service role bypasses RLS; normal selects must be by the owning user
- Wrong cadence/tier
  - Confirm `custom_id` formatting in the plan or subscription setup

## After Live switch
- Create a Live webhook with the same URL
- Set `PAYPAL_ENVIRONMENT=live`, and use Live app credentials and Live webhook ID
- Update 7 plan IDs to Live values
