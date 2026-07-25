Plan to fix the Gold badge issue:

1. Correct the dashboard membership normalizer
   - Update the dashboard user normalization so `membershipTier` is not ignored.
   - Prefer the actual paid tier (`gold`, `diamond`, `diamond_plus`, `elite`) over the legacy `membershipType` / Silver Plus value when both exist.
   - This addresses stale session data where the app may have `membershipTier = gold` but still renders `membershipType = silver_plus`.

2. Hydrate membership status from the live public profile view
   - Expand the dashboard refresh query from `public_user_profiles` to include membership fields:
     - `membership_tier`
     - `membership_type`
     - `silver_plus_active`
     - `diamond_plus_active`
   - This ensures the dashboard updates from live database values even when the browser has stale session storage after login.

3. Harden the badge rendering logic
   - Update `ProfileSidebar` so the badge checks both `membership_tier` and `membership_type`.
   - Keep Gold/Diamond/Elite badges higher priority than Silver Plus.
   - Still show Silver Plus as a secondary lifetime chip if the user also has `silver_plus_active = true`.

4. Validate against the known account
   - Confirmed the database already has `@tipperjones` as:
     - `membership_tier = gold`
     - `membership_type = gold`
     - `silver_plus_active = true`
   - After the code change, this should render as `Gold Member` plus the optional `Silver Plus (Lifetime)` chip instead of `Silver Plus Member`.