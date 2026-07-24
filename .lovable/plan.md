# Friendlier PayPal Auth Error Messages

When PayPal returns `invalid_client` from the OAuth token endpoint, the edge functions currently surface a generic "Edge Function returned a non-2xx status code" toast. This plan adds a specific, actionable message so future env/credential mismatches are obvious.

## What changes

For every edge function that calls `POST /v1/oauth2/token` against PayPal, detect `invalid_client` (and related auth failures) in the token response and return a clear error like:

> "PayPal credentials don't match the selected environment (PAYPAL_ENVIRONMENT=<sandbox|live>). Update PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in Supabase secrets to match, then redeploy."

The response will also include the `PAYPAL_ENVIRONMENT` value and PayPal's `debug_id` for support.

## Files to update

Edge functions that authenticate to PayPal:

- `supabase/functions/create-paypal-subscription/index.ts`
- `supabase/functions/create-paypal-order/index.ts`
- `supabase/functions/create-membership-order/index.ts`
- `supabase/functions/start-membership-paypal/index.ts`
- `supabase/functions/process-card-membership/index.ts`
- `supabase/functions/process-card-tip/index.ts`
- `supabase/functions/process-card-event-payment/index.ts`
- `supabase/functions/process-tip/index.ts`
- `supabase/functions/capture-tip-order/index.ts`
- `supabase/functions/capture-event-payment/index.ts`
- `supabase/functions/paypal-config/index.ts`

## Technical detail

Small shared pattern applied to each function's existing token fetch (no new files, no shared module — keep each function self-contained per existing project convention):

```ts
if (!tokenResponse.ok) {
  const errText = await tokenResponse.text();
  let parsed: any = {};
  try { parsed = JSON.parse(errText); } catch {}
  const isAuthMismatch =
    parsed?.error === "invalid_client" ||
    tokenResponse.status === 401;

  const friendly = isAuthMismatch
    ? `PayPal rejected the credentials for PAYPAL_ENVIRONMENT="${paypalEnvironment}". The PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in Supabase secrets are for a different environment (or a different PayPal app). Update them to a matching ${paypalEnvironment} REST app and redeploy.`
    : "Failed to authenticate with PayPal.";

  return new Response(
    JSON.stringify({
      success: false,
      error: friendly,
      paypal_environment: paypalEnvironment,
      debug_id: parsed?.debug_id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
  );
}
```

No DB changes, no schema changes, no frontend changes required — existing toasts will display the new `error` string directly.
