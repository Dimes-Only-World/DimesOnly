

## Plan: Restyle Jackpot Card to Match Landing Page Design

### Change
Update the jackpot display card in `src/components/ImageCarousel.tsx` (lines 526-538) to use the landing page's black/magenta color scheme instead of the current gold/orange gradient.

### Edit (`src/components/ImageCarousel.tsx`, lines 526-538)
- **Card background**: `bg-gradient-to-br from-yellow-900 to-orange-900` → `bg-black border border-[#E916D1]/30 shadow-lg shadow-[#E916D1]/10`
- **Trophy icon**: `text-yellow-400` → `text-[#E916D1]`
- **"Jackpot" text**: `text-yellow-100` → `text-[#F4F6F8]`
- **Amount text**: `text-yellow-300` → `text-[#E916D1]`

This aligns with the landing page's Magenta/Black/Light Gray palette used across all other sections.

