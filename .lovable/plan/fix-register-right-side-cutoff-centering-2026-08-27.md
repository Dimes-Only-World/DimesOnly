# Fix /register right-side cutoff / centering

## Symptom
On the mobile preview (and possibly tablet/desktop), the /register page content is clipped on the right edge — the form card and carousel extend past the right side instead of sitting edge-to-edge like the left side, making the page look off-center.

## Diagnosis (first step, verify before finalizing fix)
Use Playwright to load `http://localhost:8080/register` at mobile (393px) and desktop widths and measure:
- `document.documentElement.scrollWidth` vs `window.innerWidth` — confirms horizontal overflow.
- Walk the DOM to list elements whose `getBoundingClientRect().right > innerWidth` — identifies the exact offending element(s).

Prime suspects (verified in code this session):
- `src/pages/Register.tsx` — the mobile card wrapper chain (`w-full` + `getCardClasses` `rounded-none` + inner `px-4`) is sound, but a child inside `RegistrationFormFields` (e.g. a date-of-birth select row, file upload field, or a long unbroken input value) may force a min-width beyond the viewport.
- `src/components/LatestDimesCarousel.tsx` — cards are `w-[60%]` with `ml-[20%]`/`mr-[20%]` peek margins inside an `overflow-x-auto` track; if the track itself isn't clipped (`min-w-0` / overflow containment), it can widen the page on some browsers.
- A `w-screen`/`100vw` style anywhere in the chain (100vw includes the scrollbar and overflows by ~15px on desktop).

## Fix (applied after the offending element is identified)
1. In `src/pages/Register.tsx`:
   - Add `overflow-x-hidden` to the outer page wrapper so no child can push the layout past the viewport.
   - Ensure the form card wrapper is `w-full max-w-[896px] mx-auto` with symmetric padding (`px-4` mobile, `px-6` desktop) so left/right gutters are equal on every viewport.
2. In `src/components/LatestDimesCarousel.tsx`:
   - Add `min-w-0 max-w-full` to the scroll track wrapper so the carousel is strictly clipped to the viewport while remaining edge-to-edge.
3. Fix whichever child element the Playwright scan flags (add `min-w-0` / `w-full` / `max-w-full` or `flex-wrap` as appropriate).

## Verification
- Re-run the Playwright scan: `scrollWidth === innerWidth` at 393px, 768px, and 1280px.
- Screenshot /register at mobile and desktop: form card centered with equal side padding, carousel reaching both edges, no right-side clipping.
