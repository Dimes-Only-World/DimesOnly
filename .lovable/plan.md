

## Plan: Move Jackpot + TIP & WIN Before Latest Dimes Carousel

### Approach
Extract the Jackpot display and "TIP & WIN" info into a new standalone component, place it before `LatestDimesCarousel` in `NewIndex.tsx`, and remove that JSX from `ImageCarousel.tsx`.

### Changes

**1. Create `src/components/JackpotTipWin.tsx`** (new file)
- Move the jackpot fetch logic (Supabase query from `v_jackpot_active_pool` / `jackpot` fallback + real-time subscription) into this component
- Move the Jackpot card JSX and TIP & WIN text block into this component
- Self-contained with its own `useState`/`useEffect` for jackpot amount

**2. Edit `src/components/ImageCarousel.tsx`**
- Remove the Jackpot Display div (lines 525-538) and Tip & Win Info div (lines 540-566)
- Remove `jackpotAmount` state and jackpot fetch `useEffect` (lines 72, 269-296) since they'll live in the new component
- Remove `Trophy` icon import if no longer used elsewhere in the file

**3. Edit `src/pages/NewIndex.tsx`**
- Import `JackpotTipWin`
- Place `<JackpotTipWin />` before `<LatestDimesCarousel />` (line 19)

### Result
Home page order becomes: HeroBanner → ReferrerProfile → GetStartedSteps → ReadyToStart → **Jackpot + TIP & WIN** → LatestDimesCarousel → ImageCarousel → PositionCounter → SecurePlatform → Footer

