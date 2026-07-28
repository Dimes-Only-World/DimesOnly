Plan to make push notifications actually register and deliver:

1. Restore the required public push assets
   - Add `OneSignalSDKWorker.js` at the site root, because the current code points OneSignal to that worker and the file is missing.
   - Add `notification-icon.png`, because the push Edge Function currently uses that icon URL.
   - Add/update the web manifest used for Home Screen installation so mobile browsers identify the app correctly.

2. Tighten the browser subscription flow
   - Update the OneSignal hook so it clearly distinguishes: permission not granted, SDK unavailable, worker missing, subscribed but not saved, and fully connected.
   - Keep the existing secure `save-push-subscription` Edge Function path, but surface the real failure message in the bell instead of silently failing.

3. Add an admin/user push test path
   - Add a small “Send test push to me” action in the notification bell/admin notification area so we can verify the current device without blasting all users.
   - The test will create an in-app notification and attempt OneSignal push for only the logged-in user.

4. Verify against the live backend
   - Confirm the current logged-in user gets a row in `push_subscriptions` after tapping Enable/Reconnect.
   - Call the notification Edge Function for that user and confirm the response reports push recipients greater than zero.
   - Check function logs for any OneSignal API errors.

Confirmed current issues from live checks:
- OneSignal app ID is configured.
- The current logged-in user `gime` has no saved push device in `push_subscriptions`, so lock-screen/desktop push cannot be delivered to that account yet.
- `public/OneSignalSDKWorker.js`, `public/manifest.webmanifest`, and `public/notification-icon.png` are missing, while the code references them.