# Dashboard Conversion & Polish Pass

The profile dashboard currently stacks many sections in a long scroll (hero video, banners, carousels, money circle, Silver Plus card, upgrade button, tile grid). Everything competes for attention, styling is mixed (white cards + blue/pink gradients + emoji buttons), and the upgrade offer is buried mid-page. The goal: one clear hierarchy, one visual language, and one obvious money action per screen.

## 1. Above-the-fold command bar

Replace the current top stack with a compact hero:

- Greeting row: avatar, username, membership badge (Silver / Diamond / Elite Plus), profile completion ring.
- Three KPI chips: Available Earnings, Jackpot Tickets, Referrals — each tappable to the matching tab.
- One primary CTA button whose label and target depend on tier (e.g. "Upgrade to Diamond", "Upgrade to Elite Plus"), plus a secondary "Share My Link" button.
- Hero video moves below the command bar and collapses to a thin banner on mobile.

## 2. Profile completion / activation checklist

A dismissible card listing the 4-5 actions that drive revenue: add profile photo, upload first media, share referral link, complete payout method, upgrade membership. Each item shows done/not-done and links directly. This is the single biggest converter for new users because it gives them a next step instead of a wall of sections.

## 3. Single upgrade module (replaces scattered offers)

Consolidate the Silver Plus card, Diamond Plus button, Elite plus button, Upgrade Membership button, and Free Membership banner into one Membership card:

- Current plan and what it unlocks.
- Next tier with 3 benefit bullets, price, and scarcity line (positions remaining counter) where applicable.
- Locked tiers below the current plan stay greyed out (existing rule).
Only one upgrade CTA on the page, repeated once as a sticky mobile bar when the user scrolls past it.

## 4. Section ordering and density

New order on /dashboard/profile:

1. Command bar (KPIs + CTA)
2. Activation checklist
3. Membership upgrade card
4. Money Circle (with online dots)
5. Top 20 carousel
6. Latest Dimes carousel
7. Social Feed entry
8. Profile banner + navigation tiles

Carousels get consistent card sizing, snap scrolling, and a "View all" link so they read as one family instead of separate widgets.

## 5. Visual system cleanup

- Route all colors through the existing tokens (magenta accent, dark surface) instead of ad-hoc `from-blue-900`, `from-fuchsia-500`, `bg-white` combinations.
- Uniform card radius, border, and shadow; consistent section heading style with a short subtitle.
- Replace emoji in buttons with lucide icons.
- Nav tiles: same card treatment, icon in a tinted circle, badge counts for unread messages and notifications.

## 6. Loading and feedback

- Skeleton placeholders for the command bar, carousels, and money circle instead of the full-page spinner, so the dashboard feels instant.
- Empty states with a CTA (e.g. "No referrals yet — share your link") rather than blank areas.
- Subtle count-up animation on the earnings number and fade-in on section mount.

## Technical notes

- Work stays in presentation components: `UserDashboard.tsx` plus new `DashboardCommandBar.tsx`, `DashboardChecklist.tsx`, `DashboardMembershipCard.tsx` under `src/components/`.
- No schema or edge-function changes; checklist and KPI values read from data already loaded (`userData`, earnings summary, referral counts).
- Membership tier ranking reuses the logic already in `Upgrade.tsx` so locked tiers behave identically.
- Colors added as tokens in `index.css` / `tailwind.config.ts` if any are missing.

## Scope check

This is a layout and styling pass. Existing functionality (payments, referrals, jackpot, notifications) is untouched — sections are re-composed, not rewritten.