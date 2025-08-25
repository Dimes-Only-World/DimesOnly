# PayPal + Supabase Secrets Checklist

Add these in Supabase Dashboard → Project Settings → Secrets → Add new secret.
Environment: Sandbox now; repeat for Live at launch.

- PAYPAL_ENVIRONMENT = sandbox
- PAYPAL_CLIENT_ID = <your sandbox client id>
- PAYPAL_CLIENT_SECRET = <your sandbox client secret>
- PAYPAL_WEBHOOK_ID = WH-XXXXXXXX (from PayPal after webhook is created)

Subscription Plan IDs (paste the exact P-… values after you create each plan):
- PAYPAL_SILVER_MONTHLY_PLAN_ID = P-________
- PAYPAL_SILVER_YEARLY_PLAN_ID = P-________
- PAYPAL_GOLD_MONTHLY_PLAN_ID = P-________
- PAYPAL_GOLD_YEARLY_PLAN_ID = P-________
- PAYPAL_DIAMOND_MONTHLY_PLAN_ID = P-________
- PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID = P-________
- PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID = P-________

Notes
- After updating secrets, redeploy Edge Functions so new values are picked up.
- In Live, set `PAYPAL_ENVIRONMENT=live` and use Live app credentials, a Live webhook, and Live plan IDs.
