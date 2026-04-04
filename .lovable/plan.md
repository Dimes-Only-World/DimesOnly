

# Update Diamond Package and Diamond Plus Pricing

## 1. Diamond Package — Remove "Profit share 10%" benefit

Remove the profit share line from the benefits array in three files:

- **`Upgrade.tsx`** (root) — line 101: delete the "Profit share 10%..." line
- **`src/pages/Upgrade.tsx`** — line 100: delete the "Profit share 10%..." line
- **`src/pages/UpgradeDiamondMonthly.tsx`** — line 209: delete the "Profit share 10%..." line

## 2. Diamond Plus — Change price to $149.99 + new installment plan

Update across two files:

### `src/pages/UpgradeDiamond.tsx`
- All `$349.99` references → `$149.99` (lines 102, 217, 344, 621, 737, 754, 761)
- All `111.73` installment amounts → `$50.00` (lines 344, 650, 738, 755, 761)
- Line 644: `$149.00` → `$149.99`
- Line 647: change fee text to `$49.99 down payment`
- Line 641: change "2 Installments" heading to reflect $49.99 down + 2×$50.00
- Line 653: update "× 2 payments" to "2 installments of $50.00"

### `src/components/DiamondPlusButton.tsx`
- Line 130: `$349.99` → `$149.99`
- Line 150: `$149.00` → `$149.99`
- Line 153: change `$11.73 installment fee` → `$49.99 down payment`
- Line 154: `$111.73 per installment` → `$50.00 per installment`

Six files total, straightforward text/number replacements.

