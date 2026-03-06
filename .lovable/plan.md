

## Plan: Replace Content Counts with Yes/No

### Change
In `src/components/DimesDirectory.tsx` (lines 396-407), replace the numeric content counts with "Yes" or "No" based on whether the count is greater than 0.

**Before:**
```
Free Content: 1
Nude Content: 0
X-Rated Content: 1
```

**After:**
```
Free Content: Yes
Nude Content: No
X-Rated Content: Yes
```

### File Changed
- `src/components/DimesDirectory.tsx`: Replace `{profile.content_free_count}` with `{profile.content_free_count > 0 ? 'Yes' : 'No'}`, and same for `content_nude_count` and `content_xrated_count`. Style "Yes" in green and "No" in gray for visual clarity.

