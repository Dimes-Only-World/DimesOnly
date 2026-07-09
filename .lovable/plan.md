## Why login feels slow and needs a refresh

Three things stack up on top of each other after you click Sign In:

1. **Login waits on a second sign-in it doesn't need.** After the `authenticate-user` edge function returns (fast), `Login.tsx` `await`s `supabase.auth.signInWithPassword(...)` before navigating. That's a second full round trip (often 1–3s) that blocks navigation to `/dashboard`. If it's slow or fails, you're stuck on the Sign In button.

2. **`AuthGuard` blocks the dashboard on an extra DB round trip.** On every mount it does `supabase.from('users').select('is_active').eq(id).single()` and shows the full-screen spinner (`isAuthenticated === null`) until that finishes. Even though we already know the user is logged in (token + `userData` in storage + `user` in context), nothing renders until this query returns.

3. **`AppContext` re-fetches the user on the SIGNED_IN event.** When the deferred Supabase sign-in finally lands, `onAuthStateChange` fires and re-loads from sessionStorage (visible in the console log: `Auth state SIGNED_IN: loading user from sessionStorage`). That triggers a second render cycle in `UserDashboard`'s effect (`[user?.id]`), which re-runs `fetchUserViaEdgeFunction` and re-fetches the profile — the "why does it load twice / need a refresh" feel.

The refresh works because on reload, sessionStorage already has the full user, Supabase's session is already persisted, and no second sign-in is queued behind navigation.

## Plan

### 1. Make Login navigate immediately
In `src/pages/Login.tsx` `handleSubmit`:
- After `authenticate-user` succeeds, `setUser(...)`, write `authToken` / `userData` / `currentUser`, and **`navigate('/dashboard/profile', { replace: true })` right away**.
- Kick off `supabase.auth.signInWithPassword(...)` as **fire-and-forget** (no `await`), so the Supabase session gets minted in the background without blocking navigation.
- Delete the unused duplicate `src/Login.tsx` so there's one source of truth.

### 2. Stop AuthGuard from blocking first paint
In `src/components/AuthGuard.tsx`:
- If we already have a local session (Supabase session **or** `authToken` + `userData`), set `isAuthenticated = true` synchronously and render children immediately.
- Run the `is_active` check in the background; only force logout if it explicitly returns `is_active === false`. Network errors / slow responses no longer freeze the page.

### 3. Stop AppContext from re-fetching on the post-login SIGNED_IN event
In `src/contexts/AppContext.tsx`:
- In the `onAuthStateChange` handler, if `event === 'SIGNED_IN'` and the current `user.id` already matches the session's `user.id`, do nothing (no re-parse, no state update).
- Use a `useRef` for the current user id inside the callback so we avoid the stale-closure bug and don't need to re-subscribe.

### 4. Avoid the double-load in UserDashboard
In `src/components/UserDashboard.tsx`:
- Seed `userData` from the context `user` on first render so the profile UI paints instantly with what we already have, then refresh from the DB in the background (no full-page spinner while it revalidates).

## What this changes for the user
- Click Sign In → dashboard renders within one round trip of `authenticate-user` (no second sign-in wait, no blocking `is_active` query).
- No more "blank/spinner until I refresh" — the guard trusts the local session and validates in the background.
- No duplicate profile fetch triggered by the delayed SIGNED_IN event.

## Technical notes
- Files touched: `src/pages/Login.tsx`, `src/components/AuthGuard.tsx`, `src/contexts/AppContext.tsx`, `src/components/UserDashboard.tsx`; delete `src/Login.tsx`.
- No schema changes, no edge function changes, no auth semantics changes — deactivated accounts are still force-logged-out, just asynchronously instead of pre-render.
- Keeps the existing dual-auth model (custom token + Supabase session) intact.
