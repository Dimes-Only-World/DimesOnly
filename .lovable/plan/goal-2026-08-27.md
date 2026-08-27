Update /tip page to full-bleed, edge-to-edge sections

## Goal
Remove horizontal and outer section padding on the `/tip` page so every content block spans the full width of the viewport, matching an edge-to-edge layout.

## Current State
- `src/pages/Tip.tsx` renders a gradient-wrapped page with a `max-w-6xl mx-auto p-4` center container and two columns of cards inside.
- Cards (`Card`/`CardContent`) use default padding and rounded corners, creating inset sections and visible gutters.

## Plan
1. Read the full JSX layout in `src/pages/Tip.tsx` (lines 759+) to enumerate every top-level section: banner area, profile column, tipping column, and any footer sections.
2. Make the root page wrapper full-width with no horizontal padding:
   - Keep the gradient background.
   - Replace the `max-w-6xl mx-auto p-4` container with a full-width `w-full p-0` container or stack of sections.
3. Convert each major section into a full-bleed band:
   - Banner/hero block: already `w-full`, verify no inner margins break edge-to-edge.
   - Profile and tipping columns: stack vertically on all viewports or use full-width grid columns that touch edges; remove `p-4`/`gap-8` gutters that push content away from screen edges.
   - Update `Card`/`CardContent` usage so each card is full-width with `rounded-none` and `p-0` (or minimal internal padding only where content needs it).
4. Preserve content readability:
   - Keep internal spacing for text/inputs inside each band so buttons and forms do not stick to the extreme edges.
   - Use small internal left/right padding on inner content only when necessary (e.g., `px-4` inside a form), while the section background/band itself remains full-width.
5. Verify responsive behavior:
   - Ensure the layout does not break on large screens (use full-width sections rather than a constrained max-width container).
   - Ensure stacked mobile view still works without unintended side padding.
6. Build and preview the `/tip?tip=<username>` route, confirming each section reaches the viewport edges.

## Out of Scope
- No changes to tipping business logic, payments, media fetching, or referral calculations.
- No changes to the `/rate` or `/profile` pages unless identical padding issues are discovered in shared components and the user requests it.
