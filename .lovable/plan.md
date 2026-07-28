## Plan

**Favicon source:** the newly uploaded angel-with-red-halo silhouette (`user-uploads://image-374.png`). All icon sizes will be generated from this image.

### 1. Restore missing icon / manifest / worker files
Regenerate from the uploaded angel logo and write into `public/`:
- `favicon.ico`
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png` (180×180, padded on solid background so iOS Home Screen icon renders correctly)
- `favicon-192x192.png`, `favicon-512x512.png` (maskable-safe padding)
- `notification-icon.png` (used as OneSignal badge/fallback)

Also create the currently-404ing files:
- `public/manifest.webmanifest` — `name: "Dimes Only World"`, `short_name: "Dimes Only"`, `display: "standalone"`, `theme_color`, `background_color`, and the icons above.
- `public/OneSignalSDKWorker.js` — imports the OneSignal SDK worker script (required for lock-screen push delivery).

### 2. Home Screen detection utility
New `src/hooks/useHomeScreenStatus.ts`:
- Detects installed / standalone launch via `window.matchMedia('(display-mode: standalone)')` and iOS `navigator.standalone`.
- Detects platform: iPhone/iPad (iOS Safari), Android, or desktop.

### 3. Home Screen guidance UI
New `src/components/AddToHomeScreenPrompt.tsx`:
- Mobile-friendly modal/banner shown when: mobile device AND not launched from Home Screen AND user hasn't dismissed it this session.
- Copy: *"For lock screen notifications, please add Dimes Only World to your Home Screen"*.
- Platform-specific steps:
  - iPhone: *Tap Share → Add to Home Screen*
  - Android: *Tap menu (⋮) → Add to Home Screen / Install App*
- Uses `beforeinstallprompt` on Android to offer a one-tap "Install App" button when available.
- Dismiss stored in `sessionStorage` so it doesn't nag on every navigation.

### 4. Wire guidance into notification flow
Update `src/components/NotificationBell.tsx`:
- If mobile + not standalone: replace the "Enable" push button with an "Add to Home Screen" CTA that opens `AddToHomeScreenPrompt`.
- If standalone or desktop: keep existing `enablePush` flow unchanged.
- Once launched from Home Screen, the normal Enable button appears and OneSignal registration proceeds as today.

### 5. Facebook-style lock-screen payload (verify current state)
The `send-notification` edge function already sends:
- `chrome_web_icon` / `large_icon` / `firefox_icon` = actor profile photo
- `chrome_web_badge` = Dimes Only logo
- `chrome_web_image` / `big_picture` = actor profile photo
- Title/message like `@username just joined using your referral link`

No code change required here — but the lock screen was failing purely because `OneSignalSDKWorker.js` and the manifest were 404. Restoring them in step 1 is what makes the Facebook-style push actually reach the lock screen.

### 6. Verify
- Confirm `/favicon.ico`, `/apple-touch-icon.png`, `/manifest.webmanifest`, `/OneSignalSDKWorker.js` return 200 in preview.
- Confirm the Home Screen prompt appears on a mobile viewport and hides in desktop/standalone mode.
- Confirm the notification bell only shows the "Enable" button once installed on Home Screen (mobile).

### Technical notes
- iOS Web Push requires the site to be added to Home Screen and opened from that icon before notifications can be enabled at all — this is an Apple platform requirement, which is why the guidance step is essential for iPhone users.
- Android/Chrome supports web push without install, but installing improves reliability, icon quality, and notification appearance.
- Lock-screen visual styling (large profile photo vs. app-icon-only) is ultimately controlled by the OS and browser; our payload provides every field browsers use so the richest available style is shown.