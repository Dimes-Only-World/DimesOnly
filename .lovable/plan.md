
# Fix: Free Males and Free Females Not Saving in Admin Events

## Problem
The `free_spots_males` and `free_spots_females` fields are not being saved when editing events. They are also using unnecessary `as any` casting when creating events.

## Root Cause
In `src/components/AdminEventsTab.tsx`:

1. **Edit/Update flow (line 613-643):** The `updateData` object is completely missing `free_spots_males` and `free_spots_females` fields, so they are never sent to the database on update.
2. **Create flow (lines 449-450):** Uses `(newEvent as any).free_spots_males` even though these fields already exist on the `NewEvent` interface (lines 63-64), which is unnecessary and error-prone.

## Fix (1 file, 2 changes)

**File:** `src/components/AdminEventsTab.tsx`

### Change 1: Add missing fields to the edit/update data object
Add `free_spots_males` and `free_spots_females` to the `updateData` object around line 629, after `free_normal`:

```
free_normal: editingEvent.free_normal,
free_spots_males: editingEvent.free_spots_males || 0,
free_spots_females: editingEvent.free_spots_females || 0,
```

### Change 2: Remove unnecessary `as any` casting in create flow
On lines 449-450, change:
- `free_spots_males: (newEvent as any).free_spots_males || 0`
- `free_spots_females: (newEvent as any).free_spots_females || 0`

To:
- `free_spots_males: newEvent.free_spots_males || 0`
- `free_spots_females: newEvent.free_spots_females || 0`

These fields are already defined on the interface, so the cast is not needed.
