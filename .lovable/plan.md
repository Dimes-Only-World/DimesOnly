

## Standalone dashboard section pages with profile-pic Home button

Convert each dashboard tab (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot, Referrals) into a full standalone page — same layout pattern as `/tip-girls`, `/dimes`, `/rate`, `/events`. Each page shows the user's profile picture (circular) at the top-left as the Home button (instead of the yellow Home icon button used on the discovery pages), tapping it returns to `/dashboard`.

### URL scheme (unchanged paths, new behavior)
- `/dashboard` → redirects to `/dashboard/profile` (already in place)
- `/dashboard/profile`, `/dashboard/make-money`, `/dashboard/notifications`, `/dashboard/earnings`, `/dashboard/messages`, `/dashboard/media`, `/dashboard/jackpot`, `/dashboard/referrals` → each renders **only** that section, full-page, no other tabs visible.

### New shared component: `src/components/DashboardSectionLayout.tsx`
Wraps every dashboard section page with:
- `min-h-screen bg-gradient-to-br from-slate-50 to-blue-50`
- Top bar (white, shadow) containing:
  - **Left:** circular profile-pic Home button (48–56px, rounded-full, ring + shadow). Clicking navigates to `/dashboard`. If `profile_photo` is missing, fall back to a `User` lucide icon inside a colored circle.
  - **Center:** section title (e.g. "Make Money", "Earnings")
  - **Right:** small "Welcome, {username}" + Logout icon button (kept consistent with current dashboard header)
- Children render below in a centered `max-w-7xl mx-auto px-4 py-6` container.
- Wrapped in `<AuthGuard>` so each route enforces auth like the current dashboard.

### Replace `UserDashboard.tsx`
- Remove the giant `<Tabs>` block and all the section-extra UI (video header, money circle, Diamond Plus button, Silver Plus card, banner, Upgrade button) — those belong to the **Profile** section only.
- `UserDashboard` becomes a thin router/dispatcher: read `tabParam` from `useParams`, render the matching section component inside `DashboardSectionLayout`. Unknown slug → redirect to `/dashboard/profile`.

### Section pages (rendered inside `DashboardSectionLayout`)
1. **Profile** (`/dashboard/profile`) — keeps the existing rich Profile experience: video hero, Money Circle, Diamond Plus popup/button, Subscription Progress, Silver Plus card, Dashboard Banner, Upgrade Membership CTA, then the Profile sidebar + ProfileInfo grid.
2. **Make Money** (`/dashboard/make-money`) — `<UserMakeMoneyTab />` only (keeps the `#referral-link` auto-scroll behavior already added).
3. **Notifications** — `<UserNotificationsTab />`
4. **Earnings** — `<UserEarningsTab userData={userData} />`
5. **Messages** — `<UserDirectMessagesTab />`
6. **Media** — `<UserMediaUploadTab userData={userData} onUpdate={updateUserData} />`
7. **Jackpot** — `<UserJackpotTab userData={userData} />`
8. **Referrals** — `<UserReferralsTab />`

All user-data fetching, update, image-upload, logout, and Diamond-status logic currently in `UserDashboard.tsx` is preserved (moved into `UserDashboard` dispatcher and passed down where needed).

### Money Circle navigation (already in place, kept)
- `onViewAll` → `/dashboard/referrals`
- `onGetLink` → `/dashboard/make-money#referral-link`

These now navigate between true standalone pages instead of switching tabs, matching the behavior of `/tip-girls` → `/dashboard`.

### Files
- New: `src/components/DashboardSectionLayout.tsx` (profile-pic Home button, top bar, AuthGuard wrapper)
- Edit: `src/components/UserDashboard.tsx` (remove Tabs, become section dispatcher; keep data hooks)
- No route changes in `src/App.tsx` (existing `/dashboard/:tab` route already supports this)

