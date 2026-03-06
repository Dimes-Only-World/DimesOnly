

## Plan: Clean Up Profile Media Grid for Visitors

### Problem
When visiting a profile page, the MediaGrid shows:
1. A **red X delete button** on every media item (visible on mobile, hover on desktop) — this is because Profile.tsx passes a dummy `onDelete` function that throws an error.
2. The **video play overlay** uses a camcorder-style `Video` icon inside a white circle, which looks odd as a play button.

### Changes

**`src/pages/Profile.tsx`** (~line 230):
- Remove the `onDelete` prop from the `<MediaGrid>` call (or pass `undefined`). The MediaGrid already conditionally renders the delete/replace overlay only when `onDelete` is provided, so simply not passing it will hide the red X.

**`src/components/MediaGrid.tsx`** (~lines 192-196):
- Replace the `Video` icon in the play overlay with a proper play triangle. Use Lucide's `Play` icon (filled style) instead of `Video` to give a standard play button appearance.

### Files Changed
- `src/pages/Profile.tsx`
- `src/components/MediaGrid.tsx`

