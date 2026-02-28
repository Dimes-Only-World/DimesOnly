

## Plan: Add Jackpot Amount Display Below "TOP 20 RANKED" Section

### What
Add a jackpot amount display card directly below the "VIEW CURRENT TOP 20 RANKED" carousel section in `ImageCarousel.tsx`. It will fetch the current jackpot amount from the database (same logic as `JackpotDisplay.tsx`) and show it with a trophy icon and gold styling.

### Implementation Steps

1. **Edit `src/components/ImageCarousel.tsx`**:
   - Add `Trophy` to the lucide-react imports
   - Add state for `jackpotAmount` (number, default 0)
   - Add a `useEffect` to fetch the jackpot amount from `v_jackpot_active_pool` (with fallback to `jackpot` table), plus a real-time subscription on `jackpot_pools` -- mirroring the existing `JackpotDisplay.tsx` logic
   - Add a `formatCurrency` helper
   - Insert a new jackpot display block after the carousel section (after line 485, before the modal). It will be a centered card with:
     - Gold gradient background (`from-yellow-900 to-orange-900`)
     - Trophy icon + "JACKPOT" title in yellow
     - Large formatted dollar amount
     - Magenta border glow to match the existing card styling (`border-[#E916D1]/30`, `shadow-[#E916D1]/10`)

### Technical Details

- Data source: `v_jackpot_active_pool` view (field `total`), fallback to `jackpot` table (field `amount`)
- Real-time updates via Supabase channel subscription on `jackpot_pools`
- No database changes needed -- uses existing views/tables
- No new files -- all changes in `ImageCarousel.tsx`

