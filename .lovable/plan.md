## What is happening

The in-app notification bell is working because it reads notifications from the database while you are on the website. Lock-screen notifications are different: the phone browser must have a valid OneSignal web-push service worker, app manifest, and saved push subscription. I checked the current project files and the page is linking to `/OneSignalSDKWorker.js` and `/manifest.webmanifest`, but those public files are currently missing in the project, which can prevent the phone from receiving lock-screen push notifications.

## Plan

1. Restore the required public push/PWA files
   - Add `public/OneSignalSDKWorker.js` so OneSignal can wake the browser/app and display system notifications.
   - Add `public/manifest.webmanifest` with the Dimes Only World app name, icon sizes, display mode, and theme color.
   - Confirm favicon/home-screen icon references point to files that exist.

2. Tighten the OneSignal setup
   - Keep OneSignal initialization consistent so the app does not double-initialize in conflicting ways.
   - Ensure the logged-in user is connected to OneSignal with their user ID.
   - Ensure the OneSignal push subscription ID is saved into `push_subscriptions` after the user enables alerts.

3. Improve the user-facing notification state
   - If the user is on a mobile browser and not launched from the Home Screen, show the Home Screen instructions before enabling alerts.
   - If the user has browser permission but no OneSignal subscription ID, show a clear “Reconnect alerts” action instead of saying everything is fully enabled.

4. Verify the live-facing assets locally
   - Confirm these return successfully from the app: `/OneSignalSDKWorker.js`, `/manifest.webmanifest`, `/favicon.ico`, `/apple-touch-icon.png`, and notification icons.
   - Confirm TypeScript/build still compiles.

## After this is published

Android users should open `dimesonly.world`, install/add it to Home Screen if prompted, then tap the bell and enable alerts. iPhone users must use Safari, Add to Home Screen, open from the Home Screen icon, then enable alerts. Profile-photo style notifications can be sent where the phone/browser supports them, but iOS web push may still show the app icon instead of a large profile photo due to Apple limits.