

## Restore "Upgrade Now" button for Diamond members on Media page

Diamond is a free badge automatically given to exotic/stripper users — it's not a paid tier. So Diamond members should still see the "Upgrade Now" button (pointing to Diamond Plus, the actual paid upgrade) just like Free members do.

Currently, the Media page banner hides the "Upgrade Now" button for any tier that isn't `Free`. This needs to change so Diamond also shows it.

### Fix

**`src/components/UserMediaUploadTab.tsx`**

1. **Show "Upgrade Now" button for Diamond too** (currently only shows when `tier === 'Free'`):
   - Change the condition from `membershipStatus.tier === 'Free'` to `membershipStatus.tier === 'Free' || membershipStatus.tier === 'Diamond'`.
   - For Diamond users, route the button to `/upgrade-diamond` (Diamond Plus upgrade path). For Free users, keep existing `/upgrade-silver-plus` route.

2. **Subtitle text**:
   - Free: keep existing "Upgrade to unlock more features and upload limits" (unchanged, per your earlier instruction).
   - Diamond: show "Upgrade to Diamond Plus to unlock more features and upload limits".
   - Other paid tiers (Silver, Silver Plus, Gold, Diamond Plus): keep existing "You have access to premium features and higher upload limits".

3. **Bottom "Unlock Premium Features" section**:
   - Currently only renders for Free. Leave as-is for Free; do NOT show the Silver Plus / Diamond Plus comparison cards for Diamond users (they already have Diamond — the inline "Upgrade Now" button is enough).

### Resulting behavior
- Free user → "Free Member" badge + "Upgrade Now" button (→ Silver Plus) + bottom comparison cards.
- Diamond user → "Diamond Member" badge + "Upgrade Now" button (→ Diamond Plus). No bottom cards.
- Silver / Silver Plus / Gold / Diamond Plus → badge + "premium features" subtitle, no upgrade button.

### Files
- Edit: `src/components/UserMediaUploadTab.tsx`

