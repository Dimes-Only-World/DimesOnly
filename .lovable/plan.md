

# Fix: Display and Save Free Males / Free Females Separately

## Problem
1. **Admin event card summary** (the short description under each event) only shows "Free Dimes: X strippers, X exotics" and either omits or merges the normal male/female free spots. It should display: **"Normal M/F: X Free Males, X Free Females"**
2. **Events page** (public-facing) uses `free_normal` (a combined field) instead of `free_spots_males` and `free_spots_females` for calculating and displaying remaining free spots for normal users.

## Root Cause
- The admin summary line at line 1480-1485 in `AdminEventsTab.tsx` references `event.free_normal` as a single combined number and ignores `free_spots_males` / `free_spots_females`.
- The Events page (`Events.tsx`) function `getRemainingNormalFree` (line 313) only uses `event.free_normal` and does not distinguish between male and female free spots.

## Fix (2 files)

### File 1: `src/components/AdminEventsTab.tsx`

**Change the event card summary (lines 1480-1486)** to display male and female free spots separately:

Before:
```
Free Dimes: {event.free_spots_strippers} strippers, {event.free_spots_exotics} exotics
{event.free_normal > 0 && ` . Normal M/F: ${event.free_normal}`}
```

After:
```
Free Dimes: {event.free_spots_strippers} strippers, {event.free_spots_exotics} exotics
{(event.free_spots_males > 0 || event.free_spots_females > 0) &&
  ` . Normal M/F: ${event.free_spots_males || 0} Free Males, ${event.free_spots_females || 0} Free Females`}
```

### File 2: `src/pages/Events.tsx`

**Update `getRemainingNormalFree` (lines 313-324)** to calculate remaining spots using the gender-specific fields and the viewer's gender, instead of the combined `free_normal` field.

- For male viewers: calculate remaining from `event.free_spots_males` minus male registrations
- For female viewers: calculate remaining from `event.free_spots_females` minus female registrations
- Update the badge display (line 664-667) to show "Free Males: X" or "Free Females: X" based on the viewer's gender, rather than a combined "Free Normal M/F" number

This ensures both the admin dashboard and the public events page correctly reflect the separate male and female free spot allocations.

