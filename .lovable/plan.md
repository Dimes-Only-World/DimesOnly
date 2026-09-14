# Fix /rate-girls stuck loading on Samsung Galaxy Z Fold

## Problem
On Samsung Galaxy Z Fold devices, `/rate-girls` hangs on the blue spinner and never renders the page content. The spinner matches the `AuthGuard` loading state, so the route guard is failing to resolve authentication on foldable/Samsung Internet browsers.

## Root cause (preliminary)
`AuthGuard` waits indefinitely for `supabase.auth.getSession()` and the background `users.is_active` check. On Samsung Internet with foldable viewports, this async validation can hang or stall, leaving `isAuthenticated === null` and the spinner visible forever. The guard also requires both `localStorage.authToken` and `sessionStorage.userData` to be present, which can be fragile across fold/unfold transitions.

## What we will change
1. **Harden `AuthGuard` against stalled validation**
   - Add a 4-second timeout around the auth validation flow.
   - If the timeout fires and a local session exists (`authToken` + `userData`), render the protected route optimistically instead of staying on the spinner.
   - If no local session exists after the timeout, redirect to `/login`.
   - Wrap `supabase.auth.getSession()` and the `users.is_active` fetch in `Promise.race` with the timeout so a slow/hung network call cannot block the UI.

2. **Make local-session detection more resilient**
   - Allow `AuthGuard` to consider either a Supabase session **or** the custom `localStorage.authToken` + `sessionStorage.userData` pair as authenticated.
   - If the custom session is present but `getSession()` hangs, still render the route.

3. **Keep `/rate-girls` behavior unchanged**
   - The page already redirects to `/login` when an unauthenticated user clicks a profile or photo via `requireLogin()`.
   - No changes to the ranking, filtering, or image logic.

4. **Add Z Fold cover-screen layout safety**
   - Ensure the page min-height and hero text do not break on very narrow cover screens (~280-360 px).
   - Add a `min-h-screen` fallback and reduce oversized hero text only when the viewport is under 360 px wide.

## Files to edit
- `src/components/AuthGuard.tsx` — timeout + optimistic rendering
- `src/pages/RateGirls.tsx` — minor cover-screen layout guard
- `src/index.css` — Z Fold cover-screen text/hero sizing

## Verification
- Run `bun run build` and confirm no errors.
- Use Playwright with a simulated narrow foldable viewport to confirm `/rate-girls` renders within 5 seconds when a local session is present.
- Confirm signed-out visitors are still redirected to `/login`.
