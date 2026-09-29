# Rewards & Bonuses: contests, live leaderboards, dashboard carousel

## 1. Earnings card layout (Earnings page)
- **Row 1:** "Minimum Payout" bar with **Available Earnings** placed inside it (the circled empty area), Payout Method button stays on the right.
- **Row 2:** Total Earnings (moved left, first slot), **Referral Earnings** (new card, in Total's old slot), Rental Earnings, Event Earnings.
- **Row 3:** Clothing, Car Sales, FlameFlix, Next Payout (unchanged).
- **Row 4:** a centered **Bonus Box**: total bonuses won, plus the contests the member is currently leading or placed in.

## 2. Admin: new "Rewards & Bonuses" tab
Admin creates a contest with:
- Title, prize (e.g. $200), optional description and image
- **Category** (the metric tracked automatically):
  - Most tipped (Dimes)
  - Highest rated (Dimes)
  - Most car sales (referred cars sold)
  - Biggest Money Circle (referrals)
  - Most likes (feed and media)
  - Most viewed (profile views, only if we already track views; otherwise left out)
  - Most tips given (men and fans)
  - Most referral sign-ups (business owners and everyone else)
- **Type:** "Most by end date" or "First to reach a goal" (e.g. first to 20 Dimes wins $200)
- **Who can enter:** Dimes, men, normal women, business owners (pick any)
- Start date and **expiration date**; admin can pause, end early, or delete
- When a contest ends, the winner is locked in. Admin marks the prize paid, and it's added to that member's bonus earnings.

## 3. Dashboard contest carousel
- Placed between **Welcome back** and the banner video on every member's dashboard.
- Each slide is one live contest: prize in large gold text, a countdown to expiration (or progress toward the goal), and the top 3 to 5 leaders with photos and their counts. The member's own rank is highlighted.
- Slides rotate on their own and have left/right arrows. It uses the dark magenta/gold look, with a glowing prize and animated progress bars.
- Ended contests show a "WINNER" slide for a few days, then leave the carousel.

## Technical details
- New tables: `reward_contests` (settings, category, type, goal, audience, starts_at, ends_at, status, winner_user_id, paid_at) and `reward_winners`. Both are read-only to the public through a view, and only admins can change them.
- A `rewards` edge function computes leaderboards on the server from the existing tables (tips, ratings, `vehicle_purchase_applications` sold, users.referred_by, feed/media likes), limited to activity inside the contest's time window. Admin create/update actions go through it using the custom admin token.
- Winners are decided whenever someone requests a leaderboard, so no scheduled job is needed. For goal contests the first to reach the goal wins; for dated contests the leader at expiration wins.
- Paid prizes feed into Bonus Box totals and Total Available Earnings.
- Files: `UserEarningsTab.tsx` (layout plus Bonus Box), new `RewardsCarousel.tsx` placed in the dashboard profile view, new `AdminRewardsTab.tsx`.
