

## Plan: Filter Video Previews by Content Tier

### Problem
1. **Latest 20 Dimes carousel**: When clicking a dime, the video preview fetches the most recent video regardless of content tier. It should show the latest **silver** tier video.
2. **Top 20 Ranked carousel (ImageCarousel)**: Same issue — fetches any video. It should show the latest **free** tier video.

### Changes

**`src/components/LatestDimesCarousel.tsx`** (line ~99):
- Add `.eq("content_tier", "silver")` filter to the `user_media` query so it only fetches silver-tier videos for the preview.

**`src/components/ImageCarousel.tsx`** (line ~144):
- Add `.eq("content_tier", "free")` filter to the `user_media` query so it only fetches free-tier videos for the preview.

### Files Changed
- `src/components/LatestDimesCarousel.tsx`
- `src/components/ImageCarousel.tsx`

