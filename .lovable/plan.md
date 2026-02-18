

# Add Text Outline and Notification Message to EventsDimes Page

## What Changes

In `src/pages/EventsDimesOnly.tsx` (the page at `/eventsdimes`), update the overlay text section:

1. Add a CSS text-stroke/outline effect to the "Choose Your Event Partner" heading and subtitle for better readability over the video
2. Add a new line of text below the subtitle: **"Your chosen event partner will be notified to the event(s) you will attend"**

## Technical Details

**File:** `src/pages/EventsDimesOnly.tsx` (currently named `EventsDimes` but mapped to `/eventsdimes` route)

- Add `style` with `WebkitTextStroke` and `textShadow` to the `<h1>` and `<p>` elements for a visible outline effect
- Add a new `<p>` element with the notification message, styled similarly with the outline

