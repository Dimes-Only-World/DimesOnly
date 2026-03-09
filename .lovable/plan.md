
# Increase Text Shadow on Notification Text

## Change

**File:** `src/pages/EventsDimes.tsx`, lines 215-216

The notification text "Your chosen event partner will be notified to the event(s) you will attend" currently has a weak single-layer shadow (`1px 1px 4px`). It needs to match the heavier 3-layer shadow used on the subtitle above it for better readability against the video background.

### Update:
- Change `drop-shadow-md` to `drop-shadow-lg`
- Replace the single-layer `textShadow` with the same heavy 3-layer shadow used on the subtitle: `3px 3px 8px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9), -1px -1px 6px rgba(0,0,0,0.8)`
