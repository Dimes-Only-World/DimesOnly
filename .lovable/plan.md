## Issue
The date exists in the database. For example, user `ola` has `created_at = 2025-10-25 06:48:44.4+00` in both `public.users` and `public_user_profiles`.

The issue is that not every frontend profile data path includes or preserves `created_at`:

1. **Dashboard profile** starts from cached `sessionStorage` / app context data, and `normalizeStoredUser()` currently drops `created_at`, so `ProfileSidebar` receives no date and shows `—`.
2. **Public profile page** (`/profile/:username`) uses the `public-data` edge function `fetchProfile`, but that edge function does not select `created_at`, and `Profile.tsx` does not include it in the profile type or render a Member Since value.

## Plan
1. Update `UserDashboard.tsx` so `created_at` is included in normalized cached user data.
2. Make dashboard profile hydration always merge a fresh profile row that includes `created_at`, then save the merged result back to `sessionStorage`.
3. Update `supabase/functions/public-data/index.ts` so `fetchProfile` returns `created_at` for public profiles.
4. Update `src/pages/Profile.tsx` to accept `created_at` and display a professional `Member Since` row/card using the same safe date formatting as the dashboard.
5. Add a small shared date formatter or local helper so missing/invalid dates never show `Invalid Date`; valid dates display like `October 2025`.
6. Verify both paths: logged-in dashboard profile and public profile pages should show the member date instead of `—`.