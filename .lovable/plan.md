## What I found

- The app can save OneSignal device subscriptions: there are 6 saved subscriptions across 3 users, with the latest save today.
- The user who received the latest in-app admin notifications (`ola`) currently has **0 saved push devices**, so the bell can show notifications but OneSignal has no phone device to send to.
- The admin direct-message path calls `send-notification`, but it does not pass a sender/profile image payload; this affects Facebook-style notification appearance, not delivery.
- The admin broadcast tab in the checked source still contains direct browser database insert logic; it should route through the server-side broadcast function so push is sent consistently.

## Plan

1. **Add a visible push diagnostic state**
   - Update the notification bell/setup UI so installed mobile users can clearly see whether this exact phone is saved for lock-screen alerts.
   - If browser permission is granted but no OneSignal subscription ID is saved, show a direct “Reconnect lock-screen alerts” action instead of saying notifications are on.

2. **Make subscription saving more reliable on mobile**
   - Improve `useOneSignal` to wait for both OneSignal’s subscription ID and opt-in state before marking lock-screen alerts as enabled.
   - Save the subscription again on app open/login and whenever OneSignal reports a subscription change.
   - Add safer fallback fields for OneSignal v16 so the saved ID is the actual subscription/device ID, not an empty or wrong token.

3. **Fix admin broadcast push path**
   - Update the admin Notifications tab to call the server-side `broadcast-notification` function instead of inserting notification rows directly from the browser.
   - Ensure the broadcast function creates in-app notifications and calls `send-notification` for OneSignal push.

4. **Improve direct admin message push payloads**
   - Pass admin/profile image metadata into `send-notification` where available, so lock-screen notifications can show the app/profile icon in a more Facebook-like format.

5. **Verify after implementation**
   - Check the Edge Function logs for `save-push-subscription` and `send-notification`.
   - Query `push_subscriptions` to confirm the target user has a saved device.
   - Trigger a test notification and verify the server reports push recipients instead of `no_devices`.