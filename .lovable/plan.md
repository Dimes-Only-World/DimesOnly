

# Update Text Styling on EventsDimes Page

## Changes

**File:** `src/pages/EventsDimes.tsx`

Remove `WebkitTextStroke` (outline) from all three text elements and keep only `textShadow` for readability. Change the notification text color from yellow to white.

### Specific edits:

1. **Heading (line 204):** Remove `WebkitTextStroke: '1px black'`, keep only `textShadow`
2. **Subtitle (line 210):** Remove `WebkitTextStroke: '0.5px black'`, keep only `textShadow`
3. **Notification text (lines 215-216):** Remove `WebkitTextStroke: '0.3px black'`, keep only `textShadow`, and change `text-yellow-300` to `text-white`

