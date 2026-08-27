# /register Layout Plan

## Goal
Move the "Last 20 Dimes" carousel out of the centered registration form card so it spans the full viewport width, while keeping the registration form itself centered with consistent padding. Ensure the first and last carousel cards remain center-snapped.

## Changes

### 1. Extract carousel from form card (`src/pages/Register.tsx`)
- Move `<LatestDimesCarousel />` outside the `max-w-4xl mx-auto` form wrapper.
- Place it directly under the `z-10` content wrapper, above the centered form card, so it is not constrained by the card's max-width or side padding.
- Keep the existing `RotatingBackground` and overall page wrapper untouched.

### 2. Keep form card centered
- Retain the `max-w-4xl mx-auto` wrapper for the form card.
- Keep mobile/desktop padding as currently configured (`px-4` / `p-8`).
- Keep the "Join Dimes Below" header and form fields inside the centered card.

### 3. Ensure carousel edge-to-edge and first/last centering (`src/components/LatestDimesCarousel.tsx`)
- Verify the carousel track is `w-full` with no outer horizontal padding.
- Preserve the `ml-[20%]` on the first card and `mr-[20%]` on the last card for mobile center-snap.
- Preserve `snap-center md:snap-start` so the first/last items snap to center on mobile.
- Keep navigation arrows hidden on mobile and visible on desktop.

## Verification
- Preview `/register` on mobile and desktop.
- Confirm the carousel stretches to the left/right screen edges.
- Confirm the form card remains centered with equal side padding.
- Confirm the first card is centered on initial mobile load and the last card centers when scrolled to the end.
