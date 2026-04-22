

## Move "My Money Circle" to under the dashboard hero video

The previous implementation placed the "My Money Circle" block inside the Make Money tab content. The user wants it on the main dashboard page itself, directly under the hero video (`DashboardVideoHeader`), visible immediately when landing on `/dashboard`.

### Changes

**1. Remove the block from `src/components/UserMakeMoneyTab.tsx`**
- Delete the "My Money Circle" card I added previously (the gradient block between the share message and the Download Promo Video button).
- Keep all referral fetching and share logic untouched.

**2. Create new component `src/components/DashboardMoneyCircle.tsx`**
- Self-contained component that:
  - Accepts `userId` prop
  - Fetches referrals via `supabase.rpc("get_my_referrals")`
  - Renders the same UI block (heading "My Money Circle", Snapchat-style ring avatars for last 3 referrals + usernames, or "No One Yet!" empty state)
  - Buttons navigate to the Make Money tab using `react-router` `useNavigate("/dashboard")` + a `?tab=makemoney` query param OR scroll target. Since tabs are in-page state, the simplest path is: dispatch a custom event or use a callback. Cleanest: accept an `onViewAll` and `onGetLink` callback prop and let parent handle tab switching.

**3. Edit `src/components/UserDashboard.tsx`**
- Import `DashboardMoneyCircle`.
- Render it inside the container, directly after the `DashboardVideoHeader` wrapper (around line 459, before `DiamondPlusPopup`).
- Pass `userId={userData.id}`.
- For navigation buttons, switch the active Tabs value to the Make Money tab. This requires checking the existing `Tabs` `value`/`defaultValue` setup further down in the file. If the tabs use `defaultValue` only, convert to controlled `value`+`onValueChange` so the buttons can switch tabs programmatically.

### Visual design (matches existing approved style)
- Container: `max-w-md mx-auto mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200`
- Heading: `text-xl font-bold text-purple-700 mb-4` centered
- Avatars: `w-16 h-16 rounded-full ring-4 ring-purple-500 ring-offset-2 overflow-hidden`
- Username: `text-xs font-semibold mt-2 truncate max-w-[80px]`
- Buttons: `bg-purple-600 hover:bg-purple-700 text-white w-full`

### Files
- Edit: `src/components/UserMakeMoneyTab.tsx` (remove the block)
- Create: `src/components/DashboardMoneyCircle.tsx`
- Edit: `src/components/UserDashboard.tsx` (mount component + wire tab switching)

