## Plan

1. **Remove the old yellow Home button everywhere it is still injected**
   - Remove the separate yellow/orange `Home` button bar from the shared dashboard section layout.
   - Keep the circular profile image in the dashboard header as the navigation control.

2. **Make the circular profile button always show the user profile photo when available**
   - Update the profile button so it does not rely only on cached app context.
   - If the profile photo is missing from context, load the current user’s `profile_photo` from Supabase/session data.
   - If no photo exists, keep the round user icon fallback.

3. **Place the profile button at the top of these pages**
   - Tip & Win
   - Rate
   - Dimes
   - Events pages
   - Keep it above page content so it is clearly visible.

4. **Verify the result**
   - Search for remaining yellow/orange `Home` button text.
   - Check the affected pages in preview to confirm the button is circular/profile-based, not the yellow `Home` button.

## Technical details

- Main files likely affected:
  - `src/components/DashboardSectionLayout.tsx`
  - `src/components/HomeProfileButton.tsx`
  - Existing page placements in `TipGirls.tsx`, `RateGirls.tsx`, `Dimes.tsx`, `EventsDimes.tsx`, and `EventsDimesOnly.tsx`
- No database changes are needed.