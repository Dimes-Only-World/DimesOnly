## Plan

Make sure the circular profile button (used on Make Money and other dashboard tabs) is at the top of every user-facing page reachable from the dashboard, not just the dashboard tabs themselves.

1. **Confirm dashboard tabs already have it**
   - `DashboardSectionLayout` already renders the circular profile avatar linking to `/dashboard/profile` on every dashboard subpage (Profile, Make Money, Notifications, Earnings, Messages, Media, Jackpot, Referrals). No change needed there.

2. **Add the circular profile button at the top of the non-dashboard user pages**
   Add `<HomeProfileButton />` at the top of each of these pages (and remove any old yellow/orange Home button on them):
   - `src/pages/Tip.tsx` (`/tip` — the page in the current screenshot)
   - `src/pages/Rate.tsx` (`/rate`)
   - `src/pages/Events.tsx` (`/events`)
   - `src/pages/EventDetails.tsx` (`/event-details`)
   - `src/pages/Rankings.tsx` (`/rankings`)
   - `src/pages/Jackpot.tsx` (`/jackpot`)
   - `src/pages/Upgrade.tsx` and the specific upgrade pages: `UpgradeSilver`, `UpgradeSilverPlus`, `UpgradeSilverSubscribe`, `UpgradeGold`, `UpgradeDiamond`, `UpgradeDiamondMonthly`
   - `src/pages/Elite.tsx`, `src/pages/BusinessOwnerElite.tsx`
   - `src/pages/Profile.tsx` (public profile view)
   - Leave the already-updated pages as-is: `Dimes`, `TipGirls`, `RateGirls`, `EventsDimes`, `EventsDimesOnly`.

3. **Keep behavior identical to the dashboard**
   - Shows the user's profile photo when available; round user icon fallback otherwise.
   - Clicking navigates logged-in users to `/dashboard/profile`; signed-out users to `/login`.

4. **Exclusions (not touched)**
   - Auth/entry pages: Login, Register, Reset Password, Admin Login, Test Login, home/age-gate.
   - Admin dashboard pages.

5. **Verify**
   - Search remaining pages for the old yellow `Home` button and remove.
   - Open Tip & Win (`/tip`), Rate (`/rate`), Events, Jackpot, and an Upgrade page in preview and confirm the circular profile button appears at the top.