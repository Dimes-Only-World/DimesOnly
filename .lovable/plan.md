

# Fix: Split "Want to know more about the jackpot?" Button into 2 Lines

## Overview
Modify the button on the Tip & Win page to display the text on two centered lines instead of one.

## Current State
The button at line 268-273 in `TipGirls.tsx` currently displays:
> "Want to know more about the jackpot? Click here"

## Desired Result
The button should display:
- Line 1: "Want to know more about the jackpot?"
- Line 2: "Click here" (centered below)

## Solution

### File to Modify
- `src/pages/TipGirls.tsx` (lines 268-273)

### Code Change

**Before:**
```tsx
<Button
  onClick={() => navigate("/jackpot")}
  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6 py-3"
>
  Want to know more about the jackpot? Click here
</Button>
```

**After:**
```tsx
<Button
  onClick={() => navigate("/jackpot")}
  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6 py-3 flex flex-col items-center"
>
  <span>Want to know more about the jackpot?</span>
  <span>Click here</span>
</Button>
```

## Technical Details

- Adding `flex flex-col items-center` to the button creates a vertical flex container
- Each `<span>` element becomes a flex item that stacks vertically
- The `items-center` class ensures both lines are horizontally centered
- The button's existing gradient and padding styles remain unchanged

