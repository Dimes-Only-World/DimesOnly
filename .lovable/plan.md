## Remove profile picture from Upgrade Diamond (Yearly) page

The floating profile avatar (top-left) on `/upgrade-diamond` comes from `GlobalProfileButton`, which renders on every route except those in its exclusion list.

### Change
- Edit `src/components/GlobalProfileButton.tsx`: add `/upgrade-diamond` (and related `/upgrade`, `/upgrade-diamond-monthly`, `/upgrade-silver`, `/upgrade-silver-plus`, `/upgrade-gold`, `/elite`, `/business-owner-elite`) to `EXCLUDED_PREFIXES` so the floating avatar does not appear on upgrade/checkout pages.

Scope: only the specific Diamond Yearly page, or all upgrade/checkout pages? Default plan hides it on all upgrade pages since they share the same checkout layout — confirm if you only want it removed on `/upgrade-diamond`.