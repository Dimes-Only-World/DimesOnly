

## Plan: Add Banner Video & Photo Preview to Admin Event Cards

### Problem
The admin Events tab event cards only show text info (name, date, location, price). The banner video (e.g., Comedy Nights) and photos are not displayed, even though the data exists in `banner_video_url`, `video_urls`, `photo_url`, and `additional_photos`.

### Change

**Edit `src/components/AdminEventsTab.tsx`** (lines 1535-1540)

After `</CardHeader>` (line 1535), before the description `<CardContent>`, insert a media preview block:

1. If `event.banner_video_url` exists → render `<video controls muted loop preload="auto"><source src={event.banner_video_url} type="video/mp4" /></video>` in a max-h-64 container
2. Else if `event.video_urls?.[0]` exists → render that video as fallback
3. Else if `event.photo_url` exists → render `<img>`
4. Show badge counts for videos/photos below the preview

Event media uses the public `event-videos` bucket, so URLs work directly — no signed URLs needed.

### Files Changed
- `src/components/AdminEventsTab.tsx`

