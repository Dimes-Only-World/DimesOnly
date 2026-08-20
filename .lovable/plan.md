# Full-Width Events Page

Make `/events?events=<username>` stretch edge to edge on desktop, with no empty gutters on the left and right.

## Current behavior

The page wraps everything in a container that caps width at `max-w-7xl` and adds side padding (`px-4 sm:px-6 lg:px-8`) on desktop. On wide screens this leaves large empty bands on both sides, and the referrer banner/video does not reach the screen edges.

## What changes

- The outer page wrapper becomes full width (no max-width cap, no outer horizontal padding) so the banner video/photo and the blue profile bar span the entire viewport.
- The inner content area (badge, filter tabs, Filter Events card, events grid) keeps a small breathing padding so text and inputs don't touch the screen edge, matching mobile behavior.
- The events grid expands with the wider area: more columns on very wide screens (up to 4 on xl) so cards fill the row instead of stretching oddly.
- The "No Events Available" card stays centered.
- Mobile layout is unchanged (already full width).

## Technical notes

- `src/pages/Events.tsx`: call `getContainerClasses("w-full")` for the outer wrapper instead of the default `max-w-7xl mx-auto px-4 ...`, and pass a light padding value to `getContentClasses` for the inner sections.
- Add `xl:grid-cols-4` to the events grid at line ~612.
- No changes to `useMobileLayout` defaults, so other pages using the hook are unaffected.

## Scope

Only the `/events` page. Event detail pages and other sections stay as they are unless you want the same treatment.
