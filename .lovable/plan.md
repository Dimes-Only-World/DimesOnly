

## Restyle "My Money Circle" to match the "Referred By" card

Update `src/components/DashboardMoneyCircle.tsx` to use the same soft light-blue card style shown in the screenshot.

### Visual style (match screenshot)
- Container: `bg-blue-50/60 border border-blue-200 rounded-xl shadow-sm p-5`
- Heading "My Money Circle":
  - Small icon + label style, left-aligned (not centered)
  - `text-blue-700 font-semibold text-base flex items-center gap-2`
  - Use `Users` icon from `lucide-react` at `w-4 h-4`
- Avatars (top 3 row):
  - `w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-blue-200`
  - No magenta ring — soft, subtle look matching the screenshot
- Username under avatar: `text-slate-900 text-xs font-semibold mt-2 truncate max-w-[80px]`
- Empty state "No One Yet!": `text-slate-600 text-sm`
- Expanded scroll panel:
  - `max-h-72 overflow-y-auto mt-4 rounded-lg bg-white/70 border border-blue-100 p-3`
  - Grid: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4`
  - Same avatar style as top 3
- Toggle / CTA button:
  - `bg-blue-600 hover:bg-blue-700 text-white w-full mt-4 rounded-lg`
  - (Replaces the magenta button to stay consistent with the blue card theme)

### Behavior (unchanged)
- First 3 most recent referrals always shown
- Toggle button expands/collapses the rest inline below
- Empty state still calls `onGetLink`
- Hide toggle when `referrals.length <= 3`

### Files
- Edit only: `src/components/DashboardMoneyCircle.tsx`

