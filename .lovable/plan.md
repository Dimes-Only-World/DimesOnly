

# Fix Play Button Visibility on Upload Previews

## Problem
The `BannerVideo` container relies on the video's natural height (`h-auto`). With blob URL previews, the video metadata hasn't loaded yet, so the container collapses to 0 height - hiding the absolutely-positioned play button.

The explainer videos (fetched from Supabase) load metadata faster, which is why their play button appears fine.

## Fix

### Edit: `src/components/BannerVideo.tsx`
- Add `aspect-video` to the main container div (line 142) so it always has a minimum height based on 16:9 ratio, even before the video loads
- This ensures the centered play button is always visible
- Change: `relative w-full overflow-hidden bg-black` → `relative w-full overflow-hidden bg-black aspect-video`
- Also make the video fill the container: `w-full h-auto max-w-full` → `w-full h-full object-contain`

This single change fixes upload previews while keeping explainer videos looking the same.

### Files
1. **Edit**: `src/components/BannerVideo.tsx` — add `aspect-video` to container, adjust video sizing

