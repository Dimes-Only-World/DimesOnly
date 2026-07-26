## Goal

A single notification pipeline for DimesOnly.World: every important event writes a row users see in-app (bell + badge + list, updating live) and simultaneously fires a OneSignal web push to their phone.

## What exists today

- A `notifications` table already exists with `recipient_id`, `title`, `message`, `media_url`, `media_type`, `is_read`, `created_at`, `expires_at`. It has no `type`, `link`, or `data` column.
- `UserNotificationsTab.tsx` already reads/marks/deletes notifications and already subscribes to Supabase Realtime on INSERT.
- There is no bell in any header — notifications are only reachable via a dashboard tab.
- No OneSignal code anywhere in the project.

## Plan

### 1. Database

One migration that extends the existing table (keeps all current rows and code working):

- Add `type text default 'system'`, `link text`, `data jsonb default '{}'::jsonb`.
- Add an index on `(recipient_id, is_read, created_at desc)` so the badge query is fast.
- New table `push_subscriptions`: `user_id`, `player_id` (OneSignal subscription ID), `platform`, timestamps, unique on `player_id`. RLS so a user only manages their own rows; `service_role` full access for the sender.
- Confirm/repair RLS on `notifications` so a user can only select/update/delete rows where `recipient_id = auth.uid()`, with `service_role` allowed to insert.
- Enable Realtime on `notifications` if it isn't already in the publication.

### 2. Bell UI

New `src/components/NotificationBell.tsx`:

- Gold bell icon on the dark background, 44×44px tap target, red badge with unread count (`9+` cap).
- Opens a dropdown on desktop / full-width sheet on mobile listing the latest 20 notifications: title, message, relative time, unread dot, and a "Mark all read" action. Clicking an item marks it read and navigates to its `link`.
- Subscribes to Realtime INSERT/UPDATE for the signed-in user so the badge and list update without refresh; unsubscribes on unmount.
- Reads identity the same dual way the rest of the app does (Supabase session, falling back to the sessionStorage user) so it works right after login.

Placement: rendered next to the existing floating `GlobalProfileButton` (top-right, so it never overlaps the top-left avatar) and also in the `DashboardSectionLayout` header bar, using the same exclusion list as `GlobalProfileButton` so it stays off login/register/checkout pages.

### 3. OneSignal push

- Load the OneSignal Web SDK v16 and register the two service worker files in `public/`.
- New `src/hooks/useOneSignal.ts`: initialises the SDK with the app ID, prompts for permission (soft prompt after login, not on first paint), then saves the returned subscription ID into `push_subscriptions` and calls `login(userId)` so OneSignal external IDs match Supabase user IDs.
- A small "Enable push notifications" toggle inside the bell dropdown for users who dismissed the prompt.

### 4. Reusable notify function

New edge function `send-notification` (service role, JWT verified for user calls, internal calls allowed by shared secret):

- Input: `user_id` (or `user_ids`), `title`, `message`, `type`, `link`, `data`.
- Inserts the row(s) into `notifications`, then looks up that user's `player_id`s and POSTs to the OneSignal REST API with the title, message, and a `url` deep link.
- Push failures are logged but never fail the DB insert — the in-app notification always lands.

Wire it into the existing flows:

| Event | Where it's called from |
| --- | --- |
| Referral commission earned | `process-tip`, `membership-webhook`, event payment handlers |
| Tip received | `process-tip` |
| Membership upgrade confirmed | `verify-membership-upgrade`, `paypal-subscription-webhook` |
| Jackpot / contest win | `jackpot_run_draw` result handler |
| Payout status change | `AdminPayoutTab` flow |
| Admin message / broadcast | `AdminDirectMessageTab`, `AdminNotificationTab` |

### 5. Design

Dark slate/purple surface, gold `#E916D1`-adjacent accent per the existing tokens, red badge, no hardcoded colour utilities — all through the existing semantic tokens.

## What I need from you

Two OneSignal values, which I'll request through the secure secrets form once you approve:

- `VITE_ONESIGNAL_APP_ID` — public, used by the browser SDK
- `ONESIGNAL_REST_API_KEY` — secret, used only inside the edge function

If you don't have a OneSignal app yet: create one at onesignal.com → New App → Web Push → set the site URL to `https://dimesonly.world`, then copy the App ID and REST API Key from Settings → Keys & IDs.

## Technical notes

- Existing `UserNotificationsTab` keeps working unchanged; it will just start showing the richer rows too.
- Web push does not work on iOS Safari unless the site is installed to the home screen as a PWA — Android and desktop get lock-screen notifications immediately. I'll note this in the enable-push UI.
- Service worker files must sit at the site root (`public/OneSignalSDKWorker.js`) to satisfy scope requirements.
