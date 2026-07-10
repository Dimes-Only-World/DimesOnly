## Update site favicon

Replace the current favicon (lightning bolt) with the uploaded angel silhouette image.

### Steps
1. Copy `user-uploads://image-332.png` to `public/favicon.png` (overwrite existing).
2. Bump the cache-buster in `index.html` from `?v=2` to `?v=3` so browsers reload the new icon.

No other files change.