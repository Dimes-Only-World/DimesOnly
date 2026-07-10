## Force favicon refresh

The new favicon file (`public/favicon.png`) is already the angel image, but the browser is still showing the cached lightning bolt. To force every browser/tab to re-fetch:

### Steps
1. Bump the cache-buster in `index.html` from `?v=3` to `?v=4` on the `<link rel="icon">` tag.
2. Also add matching `apple-touch-icon` and `shortcut icon` tags with the same versioned URL so iOS/legacy browsers pick up the new image too.

After deploy, a hard refresh (Cmd/Ctrl+Shift+R) may still be needed once; tabs opened afterward will show the new icon automatically.