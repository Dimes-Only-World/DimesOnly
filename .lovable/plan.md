

# Update Diamond Plus Text: Bi-Weekly Pay + CEO Support Channel

## Changes requested
Based on the screenshot (reference only), three text changes are needed on the Diamond Plus upgrade page:

1. **"$50,000 quarterly payments"** → **"Bi weekly pay of up to $8,000 max"**
2. **"Guaranteed quarterly payouts"** → **"Guaranteed bi weekly payouts"**
3. **"Direct support channel"** → **"Direct support channel to CEO"**

Also update the top-level "$200,000 a year max" figure to match ($8,000 x 26 bi-weekly periods = $208,000, but we keep $200,000 as the stated cap unless told otherwise).

## Files to edit

### 1. `src/pages/UpgradeDiamond.tsx`
**Profit Sharing card (lines 548-553):**
- Line 549: `$50,000 quarterly payments` → `Bi weekly pay of up to $8,000 max`
- Line 552: `Profit sharing compensation when you meet quarterly requirements` → `Profit sharing compensation when you meet bi weekly requirements`

**Exclusive Benefits card (lines 574, 582):**
- Line 574: `Guaranteed quarterly payouts` → `Guaranteed bi weekly payouts`
- Line 582: `Direct support channel` → `Direct support channel to CEO`

**Program Benefits list (lines 495, 498):**
- Line 495: `$50,000 quarterly payments` → `Bi weekly pay of up to $8,000 max`
- Line 498: `Direct support channel` → `Direct support channel to CEO`

### 2. `src/components/DiamondPlusDashboard.tsx`
- Line 331: `Guaranteed Quarterly Amount` → `Guaranteed Bi Weekly Amount` (and any related quarterly references in this component)

### 3. Other files with "quarterly" references in Diamond Plus context
- `src/pages/Upgrade.tsx` and root `Upgrade.tsx` — update "quarterly payments" references to "bi weekly"
- `src/components/DiamondPlusPopup.tsx` — no quarterly text currently, no change needed

All changes are simple text replacements across ~3-4 files.

