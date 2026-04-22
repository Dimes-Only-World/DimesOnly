

## Restore tab bar on the Profile page only

The Profile section (`/dashboard/profile`) should keep the full 8-tab navigation bar (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot, Referrals) so users can jump between sections. Other section pages (Make Money, Earnings, etc.) stay clean — just the profile-pic Home button + their content, no tab bar.

### Implementation

**`src/components/UserDashboard.tsx`**
- In the Profile case of the section dispatcher, render the 8-tab `<TabsList>` bar above the existing Profile content (video hero, Money Circle, Diamond Plus button, Subscription Progress, Silver Plus card, Banner, Upgrade button, sidebar + ProfileInfo).
- Each tab is a `TabsTrigger` styled identically to the previous version (icon + label, magenta active state, responsive `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8`).
- Clicking a tab calls `navigate("/dashboard/<slug>")` — no local tab state needed; navigation drives everything. Profile tab stays visually "active" because we're on `/dashboard/profile`.
- Use `Tabs` with `value="profile"` and the triggers' `onClick` handlers doing the navigation (instead of `onValueChange`) so each click reliably routes to its standalone page.
- Tab icons reused from current code: `User`, `DollarSign`, `Bell`, `TrendingUp`, `MessageSquare`, `Image`, `Trophy`, `Users`.

### Behavior
- `/dashboard/profile` → profile-pic Home button + **tab bar** + full Profile content.
- `/dashboard/make-money`, `/notifications`, `/earnings`, `/messages`, `/media`, `/jackpot`, `/referrals` → profile-pic Home button + section content only (no tab bar). Users return to the tab bar by tapping the Home button (which lands on `/dashboard/profile`).

### Files
- Edit: `src/components/UserDashboard.tsx` (add tab bar inside the Profile section render only)

