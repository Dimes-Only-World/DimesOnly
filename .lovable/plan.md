

# Plan: Split "Free Normal M/F" into Separate Male and Female Inputs (2-Column Rows)

## Overview
Replace the single "Free Normal M/F" input with two separate inputs for "Free Males" and "Free Females", organized in 2-column rows.

## Changes Required

### File to Modify
`src/components/AdminEventsTab.tsx`

---

### 1. Add Event Form (lines 1215-1270)

**Current Layout (3 columns, 1 row):**
```text
+----------------+----------------+--------------------+
| Free Normal MF | Males Price    | Females Price      |
+----------------+----------------+--------------------+
```

**New Layout (2 columns, 2 rows):**
```text
Row 1:
+--------------------+---------------------+
| Free Males         | Free Females        |
+--------------------+---------------------+

Row 2:
+--------------------+---------------------+
| Males Price ($)    | Females Price ($)   |
+--------------------+---------------------+
```

**Code Changes:**
- Change grid from `md:grid-cols-3` to `md:grid-cols-2`
- Replace single "Free Normal M/F" input with two inputs:
  - "Free Males" bound to `free_spots_males`
  - "Free Females" bound to `free_spots_females`
- Add a second `grid-cols-2` row for the pricing inputs

---

### 2. Edit Event Form (lines 1814-1838)

**Current Layout (3 columns, 1 row):**
```text
+----------------+--------------------+
| Free Normal MF | Females Price      |
+----------------+--------------------+
```

**New Layout (2 columns, 2 rows):**
```text
Row 1:
+--------------------+---------------------+
| Free Males         | Free Females        |
+--------------------+---------------------+

Row 2:
+--------------------+---------------------+
| Males Price ($)    | Females Price ($)   |
+--------------------+---------------------+
```

**Code Changes:**
- Replace single "Free Normal M/F" input with two inputs in a 2-column grid
- Add Males Price input (currently missing from edit form)
- Move Females Price to second row alongside Males Price

---

## Technical Summary

| Location | Current | After |
|----------|---------|-------|
| Add Form Row 1 | 3 cols: Free Normal, Males Price, Females Price | 2 cols: Free Males, Free Females |
| Add Form Row 2 | N/A | 2 cols: Males Price, Females Price |
| Edit Form Row 1 | 3 cols: Free Normal, Females Price | 2 cols: Free Males, Free Females |
| Edit Form Row 2 | N/A | 2 cols: Males Price, Females Price |

## Fields Used
- `free_spots_males` - Free spots for normal male users (already exists in interface/state)
- `free_spots_females` - Free spots for normal female users (already exists in interface/state)
- `males_price` - Ticket price for males
- `females_price` - Ticket price for females

