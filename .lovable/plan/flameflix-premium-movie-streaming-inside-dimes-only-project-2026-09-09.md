# FlameFlix — Premium Movie Streaming (inside Dimes Only project)

Build FlameFlix as a new section of this app at `/flix` routes, reusing Dimes Only accounts and Supabase, with demo checkout, and referral residuals that post into the existing Dimes earnings system.

## Decisions (confirmed)
- Lives **inside this project** under `/flix/...` routes
- **Reuses Dimes Only auth** — existing users log straight in; signup links to existing registration
- **Demo checkout** — mock card form always succeeds, writes plan + referral attribution to DB
- **Earnings combined** — 10% direct / 5% override residuals post to the referrer's existing Dimes earnings/commission tables and dashboards

## Phase 1 — Brand, design system, intro, landing
- Flaming-i wordmark component (ember orange #FF4D1A, flame gold #FFB020, near-black #0B0B0D); the uploaded FLAME FLIX logo PNGs become CDN assets for the nav mark
- Full-screen intro (once per session, sessionStorage): letter-by-letter wordmark, tittle ignites (spark → flame → ember glow, subtle particles), Skip after 1.5s, reduced-motion fallback, fades into hero
- `/flix` landing: Zeus-style cinematic hero with auto-rotating featured titles, muted trailer, Watch Now / Start Free Preview, price chip "$5.99/mo · $29.99 first year"
- Nav: Browse, Movies, New, Pricing, Earn, Sign In, Join FlameFlix
- Poster rows (Originals, Trending, New This Week, Action, Drama, Comedy, After Dark), hover scale, rating badge, NEW pill; devices strip; pricing preview cards; Dimes Only earnings teaser; footer

## Phase 2 — Database (migration)
New tables, each with GRANTs + RLS:
- `flix_titles` — name, logline, description, genres, rating, year, duration, cast, tags, poster_path, backdrop_path, trailer_url, video_url, featured, status (draft/scheduled/live/unlisted), is_original
- `flix_subscriptions` — user_id, plan (monthly/annual), status, current_period_end, demo flag
- `flix_watch_progress` — user_id, title_id, seconds, updated_at (Continue Watching)
- `flix_my_list` — user_id, title_id
- `flix_referral_attributions` — subscriber user_id, referrer username/code, level (direct/override), created at checkout
- `flix_payout_requests` — optional; prefer reusing existing payout_requests if shape fits
- Seed: 16 titles across genres incl. 1–2 FlameFlix Originals, using public sample MP4s + generated poster art

## Phase 3 — Browse, title, player
- `/flix/browse` rows + Continue Watching (logged in), `/flix/title/:id` (backdrop, play, + My List, cast chips, similar titles), `/flix/search` filtering title/genre/cast
- `/flix/watch/:id` custom player chrome: play/pause, 10s skip, volume, dummy quality, fullscreen, remaining time, Up Next at 10s left, progress saved
- Guests: 30-second trailer only; locked titles get a paywall modal linking to `/flix/pricing`
- Skeleton loaders, empty states, toasts

## Phase 4 — Pricing, account, earn
- `/flix/pricing`: Monthly $5.99/mo; Annual $29.99 first year with "renews at $59.99" note; plan toggle, order summary, demo card form (always succeeds) → creates `flix_subscriptions` row + referral attribution from `?ref=`/referred_by
- `/flix/account`: plan, next billing date, cancel, switch plan, compact earnings widget
- `/flix/earn`: personal referral link + code + copy + QR placeholder, share buttons (X, SMS, copy), stats (clicks, signups, active subs, monthly/annual/override residuals, lifetime, pending, available), 2 charts (earnings over time, direct vs override), tables (My Directs / Their Recruits / Payout history), Spark/Flame/Inferno rank, payout method mock + Request Payout ≥ $10
- Non-affiliates see "Join Dimes Only & earn" teaser
- Residual math: 10% of each direct referral's subscription payment per cycle; 5% on second level; Pending first 7 days → Qualified → Paid; no earnings on own subscription. Postings also land in existing earnings tables so the main dashboard tiles include FlameFlix commissions.

## Phase 5 — Admin
- `/admin` new "FlameFlix" tab (existing admin role gate via check_admin_by_user_id + edge function, matching store-admin pattern): uploads (drag-drop poster/backdrop, video URL, progress, featured flag, publish status), library manager (search/filter, bulk publish/unpublish, reorder featured, delete w/ confirm), users (plan, referral code, referrer, suspend), payouts (balances, mark paid, adjust w/ note), analytics cards (MRR, promo conversions, active titles, top referrers)
- New `flix-admin` edge function following the store-admin pattern

## Technical notes
- Posters/backdrops via lovable-assets CDN; video via public sample MP4 URLs (no heavy uploads)
- Mobile-first (390px), tablet, 1440px; keyboard nav + focus states
- Demo admin: admin@flameflix.com / FlameAdmin1! seeded into existing user_roles
- No Lorem ipsum; brand copy per brief

## Build order
1. Design system + intro + landing
2. Migration + seed catalog
3. Auth gates + browse + title + player
4. Pricing + account + /earn + attribution
5. Admin tab + flix-admin function
