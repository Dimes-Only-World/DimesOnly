# Tip-Girls Browse Grid Redesign + Broken Avatar Fix

## What you saw
The profile cards on the browse section look flat and dated, and profiles without a photo (like @Sexybabygirl) show a broken-image icon because the card asks for `/placeholder.svg`, a file that no longer exists in the app.

## The fix
1. **Fix the missing photo**
   - Replace `/placeholder.svg` with the app's real default avatar image.
   - Add a safety net: if a member's photo fails to load, the card quietly swaps to the default avatar instead of showing the broken-image icon.

2. **Redesign the browse cards to match the Dimes / Events-Dimes pages**
   - Photo-first cards: the picture fills the card, with a dark fade at the bottom so the username and city stay readable over the photo.
   - The type label (Exotic / Stripper) becomes a small magenta chip in the corner, matching the ranked-badge style used on the Dimes pages.
   - Username in bold white, city/state with a location pin beneath it.
   - The Tip Now button keeps the purple-to-pink gradient with the diamond icon, full width at the bottom of the card, with a glow on hover.
   - Cards lift slightly and the photo zooms gently on hover; clicking the photo still opens the lightbox preview.
   - Loading placeholders and the "no users found" message restyled to match the same dark glass look.

## Where
- `src/components/UsersList.tsx` — card markup and fallback image logic (this shared list is used for tipping and rating; the visual changes apply to both).

## No changes to
- Who can be tipped, prices, payments, or anything behind the scenes — look only.
