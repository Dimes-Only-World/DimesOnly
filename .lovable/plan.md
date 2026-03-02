

## Plan: Add Jackpot Info Text Below Jackpot Display

Add a styled info section directly below the jackpot card in `src/components/ImageCarousel.tsx` (after the jackpot `</div>` around line 540).

### Content to Add
A centered text block with the following content, styled to match the dark theme:
- **"TIP & WIN"** — large bold heading in pink (#E916D1)
- **"TIP DIMES FOR A CHANCE AT THE JACKPOT ABOVE."** — white subheading
- Bullet-style info lines covering minimum drawing ($1,000), maximum drawing ($1,973,400), referral bonus, rollover rules, and "Details inside!" as a link/button to `/jackpot`

### File Changed
- `src/components/ImageCarousel.tsx` — Insert new JSX block after the jackpot display div (around line 540), before the `</section>` closing tag.

