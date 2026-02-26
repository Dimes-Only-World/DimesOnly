

# Fix Color Palette — Remove All Gradients and Pink

Your palette has 5 colors only. No gradients, no pink, no purple accents, no green/blue/indigo gradients.

- **#0F172A** (Deep Navy) — backgrounds
- **#1F2937** (Charcoal) — cards, borders
- **#D35400** (Deep Amber) — CTAs, highlights, active states
- **#F3F4F6** (Soft White) — headings, body text
- **#9CA3AF** (Muted Gray) — secondary text, disclaimers

## Files to Fix

### 1. `src/index.css`
- Remove the "Gradient accents" CSS variables (`--pink`, `--purple`, `--indigo`, `--green`, `--blue`) — they are not part of the palette

### 2. `tailwind.config.ts`
- Remove the `pink`, `purple`, `indigo`, `emerald`, `sky` color definitions from the config

### 3. `src/components/GetStartedSteps.tsx` (line 32)
- Step titles use `bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent`
- Replace with solid `text-primary` (Deep Amber)

### 4. `src/components/ReadyToStart.tsx` (lines 11-18)
- "START FREE" button uses `bg-gradient-to-r from-emerald-500 to-sky-500`
- "LOGIN" button uses `bg-gradient-to-r from-pink-500 to-purple-600`
- Replace both with solid `bg-primary text-primary-foreground` styling (Deep Amber buttons)
- Differentiate LOGIN as an outlined button: `border border-primary text-primary` with hover state

### 5. `src/components/LatestDimesCarousel.tsx` (line 39)
- "New Dime" badge uses `bg-pink-500`
- Replace with `bg-primary` (Deep Amber)

### 6. `src/components/IncentivePositions.tsx` (lines 6-7, 28)
- Card titles use gradient classes (`from-pink-500 to-purple-600`, `from-sky-500 to-indigo-500`)
- Replace with solid `text-primary` (Deep Amber)

### 7. `src/components/SecurePlatform.tsx` (lines 8, 14, 20)
- Icon colors use `text-emerald-500`, `text-sky-500`, `text-purple-600`
- Replace all three with `text-primary` (Deep Amber) for consistency, or use `text-foreground` for a subtler look

## Result
Every element on the page will use only the 5 approved palette colors. No gradients, no pink, no purple, no extra accent colors.

