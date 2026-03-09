

## Plan: Make All Admin Tabs Mobile Responsive

### What will change
Every admin tab component will be updated to stack elements vertically on small screens, with full-width buttons and inputs, while preserving the existing desktop layout. The horizontal scroll wrapper (`overflow-x-auto`) previously added to tables will be **removed** (except for the navigation bar which already has it correctly).

### Approach
Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) consistently. No custom CSS media queries needed — Tailwind handles this cleanly.

### Files to modify (7 files)

**1. `src/components/AdminJackpotTab.tsx`**
- **Pool summary section** (line 639): Change `flex flex-wrap items-center gap-4` to a grid that stacks on mobile: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4`
- **Max tickets input + Save Cap + Reopen** (line 681): Stack vertically on mobile — `flex flex-col sm:flex-row items-stretch sm:items-center gap-2`, make Input full-width on mobile (remove `w-40`, add `w-full sm:w-40`)
- **Draw action buttons** (line 812): Change `flex items-center gap-3` to `flex flex-col sm:flex-row gap-3`, make "Run Draw" button full-width on mobile (remove `min-w-[200px]`, add `w-full sm:w-auto sm:min-w-[200px]`), all other buttons also `w-full sm:w-auto`
- **Winners table** (line 880): Remove `overflow-x-auto` wrapper if present. Instead, convert table to a card-based layout on mobile using a responsive approach: wrap `<Table>` in a `hidden sm:block` div, and add a mobile card list with `sm:hidden`
  - Actually, since this table has action buttons, simpler approach: just keep the table but ensure the whole card scrolls naturally. The table is inside a Card which is already full-width.
- **Code input fields** (lines 744, 776): Change fixed `w-48` to `w-full sm:w-48`

**2. `src/components/AdminEarningsTab.tsx`**
- **Remove** the `overflow-x-auto` wrapper around the Table (line 592)
- **Stats cards** (line 527): Already `grid-cols-1 md:grid-cols-3` — good
- **Search + Export row** (line 492): Already uses `flex-col sm:flex-row` — good
- **Table**: Keep it as-is since it's inside a Card. The table will naturally cause the card to be wider than the screen on mobile, but without a scroll wrapper it won't scroll — actually we need some solution here. Best approach: on mobile, hide less important columns. Use `hidden sm:table-cell` on Referral, Tips, Event Commissions columns
- Keep `overflow-x-auto` on the table wrapper but that's it — no other changes needed for earnings

**3. `src/components/AdminRankingTab.tsx`**
- **User ranking items** (line 196): The `flex items-center justify-between` already works well. On very small screens the "Total Score" text may overflow. Add `text-sm sm:text-lg` to the score text, and `text-xs` on mobile for "Total Score" label
- Already mostly responsive

**4. `src/components/AdminEventsTab.tsx`**
- **Header** (line 864): Change `flex justify-between items-center` to `flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center`
- **Event cards** (line 1463): The `flex justify-between items-start` should become `flex flex-col sm:flex-row sm:justify-between gap-3`
- **Event action buttons** (line 1501): Change `flex gap-2` to `flex flex-col sm:flex-row gap-2`, buttons full-width on mobile

**5. `src/components/AdminNotificationTab.tsx`**
- **Send button row** (line ~375 area): The footer with date info + send button — stack vertically on mobile: `flex flex-col sm:flex-row sm:justify-between gap-4`
- Already mostly responsive

**6. `src/components/AdminDirectMessageTab.tsx`**
- **Send button footer** (line 418): Change to `flex flex-col sm:flex-row sm:justify-between gap-4`, make Send button full-width on mobile

**7. `src/components/AdminTipAllocationTest.tsx`**
- **Action buttons grid** (line 143): Change `grid-cols-2 md:grid-cols-4` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Tip input + Test button row** (line 149): Make input full-width on mobile, remove `w-20`, use `w-full sm:w-20`
- **Expected allocation grid** (line 179): Already `grid-cols-2 md:grid-cols-4` — fine
- **Card** (line 130): Remove `max-w-4xl` so it fills available width on all screens

### Summary of key patterns applied
- Buttons: `w-full sm:w-auto` on mobile
- Button rows: `flex flex-col sm:flex-row gap-2`  
- Fixed-width inputs: `w-full sm:w-[original]`
- Text sizes: `text-sm sm:text-base` or `text-base sm:text-lg` where needed
- No horizontal scroll wrappers on content (only on nav bar)
- Tables: Keep `overflow-x-auto` only where truly needed (Earnings has 7 columns)

