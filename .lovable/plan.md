

## Move dashboard tabs under "Upgrade Membership" and restyle to match action-button row

Move the 8-tab navigation bar (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot, Referrals) out of its current position at the top of the Profile section and place it **directly under the "Upgrade Membership" button**, restyled to match the existing white action-button row from `DashboardBanner` (TIP & WIN, RATE, DIMES, EVENTS, GET A CAR, CLOTHES).

### New visual style (matches `DashboardBanner` action buttons)
- Container: `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4` (8 buttons fit one row on desktop, 4 on tablet, 2 on mobile — same responsive pattern).
- Each button: `bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium py-3 px-4 h-auto text-sm transition-all duration-200 hover:shadow-md hover:border-{color}-300 hover:text-{color}-700 group`
- Inner: `flex flex-col items-center gap-1` with a colored Lucide icon (`w-5 h-5 text-{color}-600 group-hover:text-{color}-700`) above an uppercase label.
- Per-tab accent colors (icon + hover border/text):
  - **PROFILE** — pink (User)
  - **MAKE MONEY** — green (DollarSign)
  - **NOTIFICATIONS** — blue (Bell)
  - **EARNINGS** — yellow (TrendingUp)
  - **MESSAGES** — purple (MessageSquare)
  - **MEDIA** — red (Image)
  - **JACKPOT** — orange (Trophy)
  - **REFERRALS** — cyan (Users)
- Each button uses an `onClick` that calls `navigate("/dashboard/<slug>")` — same navigation behavior as today, just restyled.
- Remove the shadcn `<Tabs>`/`<TabsList>`/`<TabsTrigger>` wrappers entirely; these are plain `<Button>` components like the action row.

### Placement (Profile section render order)
1. Hero video header
2. Money Circle
3. Diamond Plus popup + button
4. Subscription Progress
5. Silver Plus card (conditional)
6. Silver Plus Membership block
7. Dashboard Banner (with TIP & WIN / RATE / DIMES / EVENTS / GET A CAR / CLOTHES row)
8. **Upgrade Membership** button
9. **NEW: 8-button dashboard navigation row** (matching the action-button style) ← moved here
10. Profile sidebar + ProfileInfo grid

### Files
- Edit: `src/components/UserDashboard.tsx`
  - Delete the `<Tabs value="profile">…</Tabs>` block from the top of the Profile case.
  - Insert a new `<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 mb-6">` containing 8 styled `<Button>`s right after the Upgrade Membership button div.
  - Keep the existing icon imports (`User`, `DollarSign`, `Bell`, `TrendingUp`, `MessageSquare`, `Image`, `Trophy`, `Users`); remove the now-unused `Tabs`, `TabsList`, `TabsTrigger` imports.

