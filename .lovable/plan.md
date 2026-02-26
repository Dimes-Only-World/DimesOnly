

## Plan: Apply Balanced Magenta Color System Across Landing Page

### Color Rules (from user's guide)
- Hero H1: `#E916D1` (magenta)
- Section H2: `#F4F6F8` (light gray) with one keyword highlighted in `#E916D1`
- H3 subtitles: light gray, not magenta
- Primary CTAs: `bg-[#E916D1] text-black`
- Secondary CTAs: `border-[#E916D1] text-[#E916D1]`
- Links/active states: `#E916D1`
- Footer headings, small labels: NOT magenta
- Over media: translucent gradient background for text visibility

### Files to Edit

#### 1. `src/components/landing/src/components/HeroBanner.tsx`
- CTA button: change `bg-pink-600` → `bg-[#E916D1] text-black` with `hover:bg-[#E916D1]/90`
- Add translucent gradient overlay behind the CTA area (transparent → black/60) so button pops over video

#### 2. `src/components/landing/src/components/GetStartedSteps.tsx`
- H2: change from `text-foreground` to light gray with keyword "3 Easy Steps" highlighted magenta: `Get Started In <span class="text-[#E916D1]">3 Easy Steps</span>`
- Step numbers: keep `text-primary-light` (magenta variant -- fine for accent)
- H3 step titles: change from `text-primary-bright` → `text-[#F4F6F8]` (light gray, not magenta)

#### 3. `src/components/landing/src/components/ReadyToStart.tsx`
- H2: light gray with "STARTED" keyword in magenta: `READY TO GET <span class="text-[#E916D1]">STARTED</span>?`
- Primary CTA ("START FREE"): `bg-[#E916D1] text-black`
- Secondary CTA ("LOGIN"): `border-[#E916D1] text-[#E916D1]`

#### 4. `src/components/landing/src/components/SecurePlatform.tsx`
- H2: light gray with "SECURE" in magenta: `<span class="text-[#E916D1]">SECURE</span> & TRUSTED PLATFORM`
- Icon colors: keep magenta variants (they're accent icons, appropriate)
- H3 feature titles: `text-[#F4F6F8]` (not magenta)

#### 5. `src/components/landing/src/components/LandingFooter.tsx`
- Footer headings/labels: keep `text-muted-foreground` (gray) -- NO magenta per the rules
- No changes needed

#### 6. `src/components/landing/src/components/ReferrerProfile.tsx`
- H2 "DIMES ONLY WORLD": light gray with "DIMES" keyword in magenta
- Username display: keep current styling

#### 7. `src/components/LatestDimesCarousel.tsx` (existing component)
- H2 "Latest 20 Dimes to Join": change to `text-[#F4F6F8]` with "Dimes" in `text-[#E916D1]`: `Latest 20 <span class="text-[#E916D1]">Dimes</span> to Join`
- "New Dime" badge: change `text-fuchsia-400` → `text-[#E916D1]`
- Sign Up button in modal: `bg-[#E916D1] text-black` (currently `bg-pink-600`)

#### 8. `src/components/ImageCarousel.tsx` (existing component)
- Hero section heading "Win $10,000": change gradient text from purple/indigo → magenta: `from-[#E916D1] to-[#ff69db]`
- H2 "VIEW CURRENT TOP 20 RANKED": `text-[#F4F6F8]` with "TOP 20" in `text-[#E916D1]`
- CTA button: change `from-indigo-600 to-purple-600` → `bg-[#E916D1] text-black`
- "#1 Top Ranked" text: change `text-green-600` → `text-[#E916D1]`
- "AN ENTERTAINMENT APP..." tagline: change `text-indigo-400` → `text-[#E916D1]`

#### 9. `src/components/PositionCounter.tsx` (existing component)
- H2 "Incentive positions available now": light gray with "Incentive" in magenta
- Card headings "Diamond Plus Memberships" / "Silver Plus Memberships": change `text-indigo-400` → `text-[#E916D1]`
- Counter numbers: change `text-indigo-300` → `text-[#E916D1]`
- Card hover shadow: change `hover:shadow-indigo-500/30` → `hover:shadow-[#E916D1]/30`

#### 10. `src/components/landing/src/index.css`
- Update `--primary-foreground` to `0 0% 0%` (black) so that `text-primary-foreground` on magenta buttons renders as black text

### Media Overlay Rule
For CTAs/headings over video/images (HeroBanner, PositionCounter cards), use a translucent gradient background: `bg-gradient-to-t from-black/70 via-black/40 to-transparent` behind text to ensure readability while keeping media visible.

