## Plan

1. **Verify what the deployed preview is serving**
   - Check the favicon HTML tags and direct `/favicon.ico`, `/favicon.png`, and versioned icon URLs on the running preview/published URLs.
   - Confirm whether the browser tab is showing a cached icon, a served file mismatch, or Chrome UI/account autofill icon caching.

2. **Replace every browser fallback icon path**
   - Regenerate all favicon variants from the uploaded angel image:
     - `/favicon.ico`
     - `/favicon.png`
     - `/favicon-16x16.png`
     - `/favicon-32x32.png`
     - `/apple-touch-icon.png`
     - brand-new versioned filenames for cache busting.
   - Ensure the icon is tightly cropped and visible at small tab size.

3. **Update head icon tags to prioritize the new versioned files**
   - Point `index.html` to new unique filenames with a fresh cache-buster.
   - Keep `/favicon.ico` updated too because Chrome requests it even when tags exist.

4. **Add a web manifest if missing**
   - Add `/site.webmanifest` pointing to the new angel icons.
   - Link it from `index.html` so installed/PWA/browser surfaces stop using older cached assets.

5. **Validate in browser and explain remaining cache behavior**
   - Use Playwright to confirm the DOM icon tags and network/icon files are the new angel files.
   - If Chrome still shows the old icon in password/autofill/account suggestions, explain that those are Chrome profile caches, not site files, and require clearing site data/password icon cache or waiting for Chrome to refresh.