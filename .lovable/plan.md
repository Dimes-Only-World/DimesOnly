

# Fix: Events Page Banner Showing Silver (X-Rated) Content Instead of Free Content

## Problem
When a normal male/female user selects a performer on the Events page, the banner video at the top shows the performer's **latest silver-tier video** instead of their **latest free-tier video**. Silver content can contain explicit/x-rated material that:
1. Users have not paid to access
2. Users may not want to see

## Root Cause
In `src/pages/Events.tsx`, the `fetchLatestSilverVideo` function (lines 103-163) explicitly queries for `content_tier = "silver"` videos. The state variable is even named `latestSilverVideo`.

## Fix (1 file)

**File:** `src/pages/Events.tsx`

### Changes:
1. **Rename state variable** from `latestSilverVideo` to `latestFreeVideo` for clarity (line 83 and all references)
2. **Change the query filter** from `.eq("content_tier", "silver")` to `.eq("content_tier", "free")` (line 121)
3. **Update the function name** from `fetchLatestSilverVideo` to `fetchLatestFreeVideo` for consistency

### Affected Lines:
- **Line 83**: Rename state `latestSilverVideo` to `latestFreeVideo`
- **Line 107**: Rename null check variable
- **Line 121**: Change `"silver"` to `"free"` in the query
- **Line 128, 155**: Update state setter references
- **Line 157**: Update error handler state
- **Line 163**: Update dependency comment
- **Line 363**: Update conditional check in JSX
- **Line 381**: Update source reference in JSX

This ensures only safe, free-tier content is displayed in the banner for all users visiting the Events page.

