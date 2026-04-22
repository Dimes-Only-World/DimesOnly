

## Give each dashboard tab its own URL

Each section (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot) becomes a directly linkable route. The dashboard layout (header, hero video, money circle, banner, upgrade button, tab bar) stays identical — only the active section changes based on the URL.

### New routes

| URL | Section |
|---|---|
| `/dashboard` | redirects to `/dashboard/profile` |
| `/dashboard/profile` | Profile |
| `/dashboard/make-money` | Make Money |
| `/dashboard/notifications` | Notifications |
| `/dashboard/earnings` | Earnings |
| `/dashboard/messages` | Messages |
| `/dashboard/media` | Media |
| `/dashboard/jackpot` | Jackpot |

### Implementation

1. **`src/App.tsx`** — replace the single `/dashboard` route with:
   - `/dashboard` → redirect (`<Navigate to="/dashboard/profile" replace />`)
   - `/dashboard/:tab` → `<Dashboard />`

2. **`src/components/UserDashboard.tsx`**
   - Read the active tab from `useParams<{ tab: string }>()` instead of local `useState`.
   - Validate against an allow-list `["profile","make-money","notifications","earnings","messages","media","jackpot"]`; unknown values fall back to `profile`.
   - Map URL slug `make-money` ↔ internal Tabs value `makemoney` (keep existing TabsContent values, or rename them all to match the URL — will rename to keep things consistent: `make-money`, etc.).
   - On `Tabs.onValueChange`, call `navigate(/dashboard/${newValue})` instead of `setActiveTab`.
   - `DashboardMoneyCircle`'s `onViewAll` / `onGetLink` callbacks navigate to `/dashboard/make-money` instead of mutating local state.

3. **Deep-link friendly** — refreshing or sharing any `/dashboard/<section>` URL lands the user directly on that section. SPA fallback already handles deep links on Lovable hosting.

### Files
- Edit: `src/App.tsx` (route change)
- Edit: `src/components/UserDashboard.tsx` (URL-driven tab state + navigation)

