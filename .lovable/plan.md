

## Plan: Update Membership Prices and Position Caps

### Changes

**1. Silver+ price: $74.99 → $149.99**
- `src/pages/UpgradeSilverPlus.tsx` (line 34): Change `AMOUNT = 74.99` to `AMOUNT = 149.99`

**2. Silver Plus max positions: 3,000 → 300**
- `supabase/functions/check_silver_plus_availability.sql`: Change all `3000` references to `300`
- `supabase/functions/update_user_silver_plus.sql` (line 14): Change `max_memberships INTEGER := 3000` to `300`
- `src/components/SilverPlusMembership.tsx` (line 103): Update toast message from "3,000" to "300"; also update the fallback display text `'3,000'` to `'300'`
- Deploy the updated SQL function to Supabase so the RPC returns 300 as max

**3. Diamond Plus max positions: 1,000 → 300**
- `src/components/DiamondPlusButton.tsx`: Change `overallMaxCount = 1000` to `300`, and all fallback `max_count: 1000` to `300`
- `src/components/PositionCounter.tsx`: Change default state `1000` to `300` and the calculation `1000 - data` to `300 - data`

### SQL Deployment Note
The `check_silver_plus_availability` and `update_user_silver_plus` SQL functions need to be redeployed to Supabase with the updated cap of 300. I will update the SQL files and run the migration.

### Files Changed
- `src/pages/UpgradeSilverPlus.tsx`
- `supabase/functions/check_silver_plus_availability.sql`
- `supabase/functions/update_user_silver_plus.sql`
- `src/components/SilverPlusMembership.tsx`
- `src/components/DiamondPlusButton.tsx`
- `src/components/PositionCounter.tsx`

