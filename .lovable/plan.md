

# Fix: Event Details Page Showing "Paid Only" Despite Free Male Spots Available

## Problem
The Event Details page (and ticket selector) still uses the old combined `free_normal` field to calculate free spots for normal users. Since the admin now saves free spots into `free_spots_males` and `free_spots_females` (not `free_normal`), the calculation returns 0 and shows "Paid Only" even when there are 2 free male spots available.

The Events listing page was already fixed in the previous update, but the Event Details page and Ticket Selector were missed.

## Root Cause
Two components still reference `event.free_normal` instead of the gender-specific fields:

1. **EventDetails.tsx (lines 720-726)**: Calculates `totalNormalFree` from `event.free_normal`
2. **EventTicketSelector.tsx (lines 78-82)**: Calculates `availableFreeSpots` from `event.free_normal`

Since the admin saves values to `free_spots_males` and `free_spots_females`, `free_normal` is 0, so the system thinks there are no free spots.

## Fix (2 files)

### File 1: `src/pages/EventDetails.tsx`

Update the free spots display section (lines 720-766) to use gender-specific fields:
- For male users: show remaining from `free_spots_males` minus used male spots
- For female users: show remaining from `free_spots_females` minus used female spots
- Label accordingly ("Free Males: X" or "Free Females: X")

### File 2: `src/components/EventTicketSelector.tsx`

Update the `availableFreeSpots` calculation (lines 78-82) for normal/male/female users:
- Accept the user's gender (from props or context)
- For male users: calculate from `event.free_spots_males` minus `usedFreeSpots.males`
- For female users: calculate from `event.free_spots_females` minus `usedFreeSpots.females`
- Add `free_spots_males` and `free_spots_females` to the event interface (line 31)

This ensures the "Free" ticket option appears when free male/female spots exist, and "Paid Only" only shows when all gender-specific free spots are exhausted.
