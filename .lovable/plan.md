

# Update Diamond Plus: Price to $249.99 + Add Profit Share Benefit

## Changes

### 1. `src/pages/UpgradeDiamond.tsx`
- **Price**: Replace all `$349.99` references with `$249.99` (lines 102, 217, 344, 621, 737, 754, 761)
- **Installment amounts**: Change from `$111.73 × 2` to `$49.99 down + 2 × $50.00`
  - Line 344: `349.99 : 111.73` → `249.99 : 49.99`
  - Line 644: `$149.00` → `$149.99`
  - Line 647: remove `$11.73 installment fee` text, replace with `$49.99 down payment`
  - Line 650: `$111.73` → `$50.00`
  - Line 653: `× 2 payments` stays
  - Line 738: `$111.73` → `$49.99`
  - Line 755: `$111.73` → `$49.99`
  - Line 761: `111.73` → `49.99`
- **Add benefit**: Insert "Profit share to $100,000 a year max" as a new list item in the Exclusive Benefits card (after line 591)

### 2. `src/components/DiamondPlusButton.tsx`
- Line 130: `$349.99` → `$249.99`
- Line 146-155: Update installment display to show `$49.99 down + 2 × $50.00`
- Add "Profit share to $100,000/yr max" text

### 3. Memory update
Update the stored membership tier info to reflect new Diamond Plus price of $249.99

