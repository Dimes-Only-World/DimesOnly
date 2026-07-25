## Fix: "Member Since" showing "—" on some profiles

### Root cause (verified)

`ProfileSidebar` reads `userData.created_at`, but `userData` for custom-auth (sessionStorage) users comes from `sessionStorage.getItem("userData")` / `AppContext.user`, which was saved at login and does not include `created_at`. In `UserDashboard.tsx` the refetch path `fetchUserViaEdgeFunction` only runs when a matching Supabase session exists (`session?.user?.id === userId`). Pure custom-auth users have no Supabase session, so no refetch happens and `created_at` stays undefined → the guard renders "—".

Confirmed:
- All 141 rows in `public.users` have a valid `created_at` (e.g., `thetruth` = 2025-06-24), so it isn't a data problem.
- `public-data.getUserById` does return `created_at`, but it's gated behind a Supabase JWT that custom-auth users don't have.
- The `public_user_profiles` view exposes `created_at` and is readable without a Supabase JWT.

### Change

In `src/components/UserDashboard.tsx`, when the custom-auth branch can't call the JWT-gated edge function (no matching Supabase session), fall back to fetching the minimal profile fields — including `created_at` — from the `public_user_profiles` view and merge them into `userData`. This hydrates `created_at` (and keeps other display fields fresh) for custom-auth users without weakening the JWT check on `getUserById`.

Behavior after fix:
- Supabase-auth users: unchanged (still get full row via `fetchUserDataById`).
- Custom-auth users with matching Supabase session: unchanged (still use `fetchUserViaEdgeFunction`).
- Custom-auth users without Supabase session: new fallback to `public_user_profiles` populates `created_at` so "Member Since" renders the month/year.

No schema changes, no RLS changes, no changes to `ProfileSidebar` display logic (the existing guard stays as-is).

### Files touched
- `src/components/UserDashboard.tsx` — add the `public_user_profiles` fallback inside the existing `loadUserData` flow.
