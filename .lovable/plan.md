# Event Pages Edge-to-Edge & Responsive Grid Fix

## Goal
Make the `event-details` page stretch edge-to-edge the same way the `events` page now does, and ensure the `events` grid never causes horizontal scrolling on mobile or tablet.

## Changes

### 1. Event Details page — full-width stretch
- Update `src/pages/EventDetails.tsx` to use the same full-width container pattern as `src/pages/Events.tsx`.
- Replace the default `getContainerClasses()` (which keeps a `max-w-7xl` centered box) with `getContainerClasses("w-full")` so the page bleeds to the viewport edges on all screen sizes.
- Keep internal content padding via `getContentClasses()` so text and cards still have readable gutters.

### 2. Events grid — safe mobile/tablet column counts
- Review the grid in `src/pages/Events.tsx` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
- Confirm the column counts are appropriate and that card widths + gaps + padding never exceed `100vw` at any breakpoint.
- If needed, adjust gaps (`gap-3 sm:gap-4 lg:gap-6`) or breakpoints so the layout never overflows horizontally on phones or tablets.

## Verification
- Open `https://dimesonly.world/event-details?id=a1f12c1e-bac6-40f8-8109-a534d89de4ab` and confirm the page touches both viewport edges.
- Open `https://dimesonly.world/events?events=lalaivey&ref=bigtim` on mobile/tablet widths and confirm no horizontal scrollbar appears.
