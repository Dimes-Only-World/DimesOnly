

## Changes

### 1. Fix admin tab bar horizontal scrolling on mobile/tablet
**File:** `src/pages/AdminDashboard.tsx` (lines 124-161)

The current `ScrollArea` (Radix) doesn't provide native touch-based horizontal scrolling on mobile. Replace it with a simple `div` using `overflow-x-auto` and `-webkit-overflow-scrolling: touch` for native swipe scrolling. Remove the `md:grid md:grid-cols-10` from the `TabsList` since 10 columns is too cramped even on tablets — use `lg:grid lg:grid-cols-10` instead.

Also make the header responsive (lines 108-118): smaller title on mobile, wrap layout.

### 2. Update placeholder text
**File:** `src/components/AdminBannerVideoTab.tsx` (line 137)

Change `placeholder="https://example.com/video.mp4"` to `placeholder="Paste Banner video link here"`. Also make the input+button row stack vertically on small screens.

### 3. Make admin tab content mobile responsive
**Files:** `AdminEarningsTab.tsx`, `AdminUsersListEnhanced.tsx`, `AdminUserFiltersEnhanced.tsx`

- Wrap all `<Table>` elements in `<div className="overflow-x-auto">`
- Adjust filter grid breakpoints from `md:grid-cols-6` to `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
- Stack user card layouts vertically on mobile

