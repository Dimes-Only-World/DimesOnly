Apply profit-sharing tier text edits to the Silver Plus and Elite Plus membership pages.

## What will change

1. **Silver Plus checkout page** (`src/pages/UpgradeSilverPlus.tsx`)
   - In the "Membership Benefits" list, change:
     - `Profit share to $75,000 a year max` → `Profit share up to $75,000 a year max in tier 1`
   - Add directly below it:
     - `Profit share $1,200,000 a year minimum in tier 2`

2. **Elite Plus checkout page** (`src/pages/BusinessOwnerElite.tsx`)
   - This page currently does not list profit-sharing benefits. Add a matching benefits block under the "Business Owner Elite Plus" heading with:
     - `Profit share up to $200,000 a year max in tier 1`
     - `Profit share $1,200,000 a year minimum in tier 2`

## Files affected

- `src/pages/UpgradeSilverPlus.tsx`
- `src/pages/BusinessOwnerElite.tsx`

## Scope

This is a frontend text-only edit. No database, edge function, pricing, or payment logic changes.
