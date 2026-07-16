## Goal
Add a "Home" button to every dashboard tab page (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot, Referrals) so users can quickly return to the main dashboard.

## Where
The tab pages all render through `DashboardSectionLayout` (used by `src/components/UserDashboard.tsx` line 506). Adding the button in the layout gives us a single change that covers all 8 tabs.

## Change
In `src/components/DashboardSectionLayout.tsx`, add a "Home" button just above the section content (below the sticky header) that navigates to `/dashboard/profile`. Use the standard yellow-orange gradient home button pattern already used elsewhere in the app (per project memory), with the `Home` icon from lucide-react.

```text
[sticky header]
[Home button]  <-- new, left-aligned
[Top20 carousel + tab content]
```

The button is hidden on the Profile tab itself (since that's already home) by passing a prop, or shown on every tab for consistency — I'll show it on every tab except when `title === "Profile"` to avoid a redundant "Home" on the home tab.

## Files touched
- `src/components/DashboardSectionLayout.tsx` — add Home button + import `Home` icon and `useNavigate`.

No business logic changes.
