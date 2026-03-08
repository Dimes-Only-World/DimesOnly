

## Problem

The deactivation email silently fails on subsequent sends. The code doesn't check the Mailtrap API response, so there's no logging when it fails. Looking at the logs, I can see the `deactivateUser` action isn't even showing up in recent logs (only `fetchAllUsers` and `reactivateUser`), which means either:
1. The deactivation call isn't reaching the edge function, OR
2. The Mailtrap API is returning an error (e.g., rate limiting, token issue) but it's being swallowed silently

The current code does `await fetch(...)` but never checks `response.ok` or logs the response body.

## Plan

### 1. Add Mailtrap response checking to `admin-data/index.ts`

In the `deactivateUser` case, after the `fetch` call to Mailtrap, capture the response and log its status and body. This will make failures visible in the edge function logs:

```typescript
const mailtrapResponse = await fetch('https://send.api.mailtrap.io/api/send', { ... });
const responseText = await mailtrapResponse.text();
if (!mailtrapResponse.ok) {
  console.error('Mailtrap API error:', mailtrapResponse.status, responseText);
} else {
  console.log('Deactivation email sent successfully to', userData.email);
}
```

### 2. Add explicit logging for the deactivateUser action

Add a `console.log` at the start of the `deactivateUser` case so we can confirm the action is being reached, and log the user's email before attempting to send.

### 3. Redeploy the `admin-data` edge function

After the fix, redeploy and test by deactivating a user again. Check the edge function logs to see the actual Mailtrap API response, which will reveal the root cause (rate limit, auth issue, etc.).

