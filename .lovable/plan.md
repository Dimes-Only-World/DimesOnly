## Problem
The dashboard is still stuck on the loading spinner because the current dashboard fetch path still depends on a Supabase session/JWT being ready.

Two specific blockers remain:

1. `UserDashboard` calls `public-data/getUserById` when the app is using the custom login token. That edge function requires a valid Supabase JWT, so immediately after custom login it can return `401 Unauthorized` or never provide data. `fetchUserViaEdgeFunction` then returns `false` without clearing `loading`, leaving the spinner forever.
2. `AppContext` still uses an `async` callback in `supabase.auth.onAuthStateChange`. Supabase documents this as a possible deadlock/hang source; it can make later Supabase calls fail to return, which matches the stuck spinner behavior.

## Plan

### 1. Make the dashboard paint from existing sessionStorage immediately
In `src/components/UserDashboard.tsx`:
- Add a small mapper that converts the already-saved `sessionStorage.userData` / context `user` into the dashboard `userData` shape.
- On first render, seed `userData` from context/session storage and set `loading` to `false` immediately.
- Then revalidate full user data in the background.

This means `/dashboard/profile` renders even if Supabase Auth has not finished syncing yet.

### 2. Fix the infinite spinner path
In `src/components/UserDashboard.tsx`:
- Make `fetchUserViaEdgeFunction` always clear `loading` when it fails.
- If the edge function returns `401` or no data, fall back to the locally saved user instead of staying in loading state.
- Avoid setting `loading(true)` for background refresh when there is already visible user data.

### 3. Use the correct data path for custom auth
In `src/components/UserDashboard.tsx`:
- For the custom login flow (`authToken === "authenticated"`), do not rely on `public-data/getUserById` unless a Supabase JWT is already present.
- Prefer the already stored custom-auth user for first paint, then attempt background refresh only after Supabase session sync is available.

### 4. Remove the Supabase auth callback deadlock risk
In `src/contexts/AppContext.tsx`:
- Change `supabase.auth.onAuthStateChange(async (...) => ...)` to a synchronous callback.
- Do not call/await Supabase APIs inside that callback.
- Keep the existing behavior: clear user on sign-out, ignore duplicate sign-in for the same user, and load from sessionStorage only when needed.

### 5. Verify with the actual preview flow
After implementation:
- Open `/login`, sign in, and confirm the app lands on `/dashboard/profile` without needing refresh.
- Confirm the spinner is replaced by the profile/dashboard content.
- Check console/network for `401` or stuck Supabase requests and confirm they no longer block rendering.

## Expected result
Login should show the dashboard immediately from the locally saved user profile, while Supabase/session-backed refresh happens in the background. Even if the background refresh fails, the user will no longer be stuck on the loading spinner.