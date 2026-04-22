

## Restyle "My Money Circle" + inline expand

Update `src/components/DashboardMoneyCircle.tsx` to match the dashboard's dark theme and make the list expandable inline (no tab switch).

### Visual changes (match dashboard theme)
- Container: replace light purple gradient with dark card style: `bg-gradient-to-br from-slate-900 to-purple-900/40 border border-purple-500/30 rounded-xl shadow-lg`
- Heading "My Money Circle": `text-white` with magenta accent (`text-[#E916D1]`), centered, bold, no gray highlight background
- Avatar ring: `ring-4 ring-[#E916D1] ring-offset-2 ring-offset-slate-900`
- Username: `text-white text-xs font-semibold`
- Primary button: magenta `bg-[#E916D1] hover:bg-[#E916D1]/90 text-white`

### Behavior changes
1. Always show the **first 3 referrals** (most recent) at the top in the existing centered row.
2. Add internal state `expanded: boolean`.
3. Button text toggles:
   - Collapsed + has more than 3 referrals: `To See Your Full Money Circle - Click Here`
   - Expanded: `Hide Full Money Circle`
   - Empty state: `Get Your Referral Link - Click Here` (still triggers `onGetLink` → switch to Make Money tab)
4. When `expanded === true`, render the **remaining referrals** (index 3+) directly **below** the first 3, inside a scrollable container:
   - `max-h-72 overflow-y-auto` with a subtle scrollbar
   - Grid layout: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-3`
   - Each item uses the same avatar + username styling as the top 3 (slightly smaller ring is fine)
5. Remove the `onViewAll` navigation behavior — the View All button now toggles `expanded` instead. `onGetLink` prop stays for the empty state.
6. If `referrals.length <= 3`, hide the toggle button entirely (nothing more to show).

### Files
- Edit only: `src/components/DashboardMoneyCircle.tsx`
- No changes to `UserDashboard.tsx` (the `onViewAll` prop becomes unused but harmless; can leave as optional).

