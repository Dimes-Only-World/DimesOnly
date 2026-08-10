# Favicon not visible on dimesonly.world

## What's actually happening
The favicon files exist and load correctly in the preview build (`/favicon.ico` returns 200 with the angel icon). The live domain returns **404 for `/favicon.ico`**, which means the live site is still serving an older build that predates the icon files. Nothing is wrong with the image or the markup, and no SVG conversion is needed.

## Fix
1. Publish the project so the current build (including `public/favicon.ico`, the PNG sizes, the Apple touch icon, and `manifest.webmanifest`) reaches the live domain.
2. After publishing completes, confirm the live domain serves each icon URL successfully instead of 404.

## Note on browser caching
Chrome caches favicons very aggressively and keeps the old one even after a deploy. Once live, a hard refresh, or opening the icon URL directly once, will force the tab to pick up the new icon.
