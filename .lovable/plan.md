

## Plan: Place LatestDimesCarousel next to ImageCarousel

Move `LatestDimesCarousel` from its current position (line 19) to directly above `ImageCarousel` (line 21), keeping `PositionCounter` before both.

### Updated order in `src/pages/NewIndex.tsx`:
1. HeroBanner
2. ReferrerProfile
3. GetStartedSteps
4. ReadyToStart
5. PositionCounter
6. LatestDimesCarousel
7. ImageCarousel
8. SecurePlatform
9. LandingFooter

Single edit: swap lines 19-21 to reorder the three components.

