

## Show "Full Team Details" button only when Money Circle is expanded

Currently the "Click Here for Full Details on Your Team" button shows whenever there are more than 3 referrals (alongside the expand toggle). Move it so it only appears **after** the user clicks "To See Your Full Money Circle - Click Here", positioned directly under the "Hide Full Money Circle" button.

### Implementation

**`src/components/DashboardMoneyCircle.tsx`**
- Move the purple "Click Here for Full Details on Your Team" button so it renders only when `expanded && hasMore` is true.
- Place it immediately after the expand/hide toggle button (which then reads "Hide Full Money Circle").
- Keep existing styling (`bg-purple-600 hover:bg-purple-700 text-white rounded-lg mt-2`) and navigation to `/dashboard/referrals`.

### Resulting behavior
- Collapsed state (default): only "To See Your Full Money Circle - Click Here" is visible.
- Expanded state: "Hide Full Money Circle" button shows, with "Click Here for Full Details on Your Team" directly beneath it.

### Files
- Edit: `src/components/DashboardMoneyCircle.tsx` (relocate the team-details button inside the `expanded && hasMore` conditional)

