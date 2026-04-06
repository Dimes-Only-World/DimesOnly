

# Use Custom Video Player for Registration Upload Previews

## What changes
The uploaded video previews in the registration form currently use a tiny native `<video>` element (128x128px thumbnail with browser default controls). The explainer videos above use the custom `BannerVideo` component with YouTube-style controls (play/pause, seekbar, volume, fullscreen). This change makes the uploaded video previews use the same `BannerVideo` player.

## Implementation

### Edit: `src/components/FileUploadField.tsx`
- Import `BannerVideo` component
- Replace the native `<video>` preview (lines 89-95) with `<BannerVideo src={preview} loop={false} />`
- Expand the preview container from the small 128px thumbnail to a full-width layout so the custom controls are usable
- Keep the remove (X) button and filename display

### Files
1. **Edit**: `src/components/FileUploadField.tsx` — swap native video for BannerVideo in preview

