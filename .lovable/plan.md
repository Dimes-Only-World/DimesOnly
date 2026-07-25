The issue is that the date exists in the database and the deployed `public-data` edge function returns it, but the logged-in dashboard card can still render `—` because `UserDashboard` can overwrite the hydrated public profile with a stale/direct `users` table response or older sessionStorage data that does not include `created_at`.

Plan:
1. Centralize member-date hydration
   - Add a small helper in `UserDashboard.tsx` that fetches `created_at` from `public_user_profiles` by user id.
   - Use it whenever the loaded dashboard user is missing `created_at`.

2. Prevent stale overwrites
   - Update `fetchUserViaEdgeFunction` and `fetchUserDataById` so they merge new data with the previous `userData` instead of replacing it blindly.
   - If the incoming row has no `created_at`, preserve the existing/hydrated `created_at`.

3. Fix sessionStorage persistence
   - When saving `userData`, always persist both `created_at` and `createdAt` so older custom-auth/sessionStorage paths can read the same value.
   - This will stop the dashboard from showing `—` after login or refresh.

4. Apply the same safety to the public profile page
   - Keep the current direct `public_user_profiles` fallback in `Profile.tsx`.
   - Ensure the fallback can also look up by username if id-based lookup ever fails.

5. Verify
   - Test `/dashboard/profile` for the logged-in user and `/profile/ola`.
   - Confirm the Member Since card shows the real month/year instead of `—`.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>
<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>