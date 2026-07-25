## Fix badge alignment under username

In `src/components/ProfileSidebar.tsx`, the Gold/Diamond/Silver tier badges and the "Silver Plus (Lifetime)" chip render side-by-side inside a `flex flex-wrap items-center` wrapper, but the Silver Plus chip uses `ml-2` with no vertical gap, so when it wraps to a second line it hugs the left edge and appears misaligned under the primary badge.

### Change
Update the wrapper and chip spacing in `getMembershipBadge()` (all tier branches: Elite Plus, Diamond Plus, Gold/Diamond/Elite tiers):
- Replace `flex flex-wrap items-center` with `flex flex-wrap items-center justify-center gap-2`
- Remove the `ml-2` from the Silver Plus chip (gap handles spacing consistently on one line and when wrapped)

Result: both chips center-align under `@tipperjones` on one row when they fit, and stack cleanly centered when they wrap — matching the centered layout of the profile card.

No logic/data changes; purely presentational.