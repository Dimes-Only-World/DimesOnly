The database is not the problem: `ola` has a valid `created_at` in both `public.users` and `public_user_profiles`.

The issue is the login/session data path:
- `authenticate-user` does not select or return `created_at`.
- `Login.tsx` saves `sessionStorage.userData` without `created_at`.
- `AppContext.tsx` trusts that saved session data first and returns early, so after logout/login the dashboard can render from a user object that has no member date.
- The profile hydration code tries to patch it later, but the app still has multiple auth/session paths that can overwrite or bypass the patched date.

Plan:
1. Update `authenticate-user` to include `created_at` in the safe returned user payload.
2. Update `Login.tsx` to save both `created_at` and `createdAt` into the user object immediately after login.
3. Update `Register.tsx` to save the created date after new signup so new sessions also have it.
4. Harden `AppContext.tsx` so saved session data is treated as a fast first paint only, then it refreshes/merges canonical profile data instead of returning early with stale data.
5. Keep the existing `ProfileSidebar` formatter, but ensure every dashboard/profile prop path receives a preserved `created_at` value.
6. Verify by reproducing the exact sequence: login as `ola`, confirm Member Since, logout, log back in, confirm it still displays.