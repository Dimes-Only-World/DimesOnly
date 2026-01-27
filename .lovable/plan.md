
# Fix Plan: Jackpot Button Issues

## Overview
This plan addresses two issues:
1. The "View My Ticket Details" button on the /jackpot page redirects to the dashboard on mobile instead of expanding ticket details inline
2. The "Want to know more about the jackpot?" button needs to be split into 2 lines with "Click here" centered on the second line

---

## Issue 1: Mobile Button Navigation Bug

### Problem Analysis
The "View My Ticket Details" button on the `/jackpot` page should toggle an expandable section to show ticket codes. On desktop this works correctly, but on mobile it appears to redirect to the dashboard.

Looking at the code in `src/pages/Jackpot.tsx` (lines 159-182), the button itself doesn't contain any navigation logic - it only toggles the `showTicketDetails` state. The likely cause is that touch events on mobile may be propagating to a parent element or there's an issue with how the button handles mobile interactions.

### Solution
1. Add explicit `type="button"` attribute to prevent any form submission behavior
2. Add `e.stopPropagation()` to the click handler to prevent event bubbling
3. Ensure the button is not nested inside any Link or anchor elements

### Files to Modify
- `src/pages/Jackpot.tsx`

### Code Changes

**Jackpot.tsx - Lines 159-182:**
```tsx
<Button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!showTicketDetails && ticketCodes.length === 0) {
      fetchTicketCodes();
    }
    setShowTicketDetails(!showTicketDetails);
  }}
  className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
  disabled={loadingTickets}
>
  {/* ... button content unchanged ... */}
</Button>
```

---

## Issue 2: "Want to know more about the jackpot?" Button Layout

### Problem Analysis
Currently the button displays as a single line:
> "Want to know more about the jackpot? Click here"

The user wants it split into 2 lines with "Click here" centered on the second line:
> Line 1: "Want to know more about the jackpot?"
> Line 2: "Click here" (centered)

### Solution
Modify both buttons in `TipGirls.tsx` and `UserJackpotTab.tsx` to use a flex column layout with the text split across two lines.

### Files to Modify
- `src/pages/TipGirls.tsx` (lines 268-274)
- `src/components/UserJackpotTab.tsx` (lines 683-689)

### Code Changes

**TipGirls.tsx - Lines 268-274:**
```tsx
<Button
  onClick={() => navigate("/jackpot")}
  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6 py-3 flex flex-col items-center"
>
  <span>Want to know more about the jackpot?</span>
  <span>Click here</span>
</Button>
```

**UserJackpotTab.tsx - Lines 683-689:**
```tsx
<Button
  onClick={() => navigate("/jackpot")}
  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6 py-3 flex flex-col items-center"
>
  <span>Want to know more about the jackpot?</span>
  <span>Click here</span>
</Button>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Jackpot.tsx` | Add `type="button"`, `e.stopPropagation()`, and `e.preventDefault()` to View My Ticket Details button |
| `src/pages/TipGirls.tsx` | Split button text into 2 lines using flex column layout |
| `src/components/UserJackpotTab.tsx` | Split button text into 2 lines using flex column layout |

---

## Technical Details

### Why the Mobile Bug Occurs
Mobile browsers handle touch events differently than desktop click events. When a touch event occurs, it can sometimes propagate to parent elements or trigger unintended behaviors. By adding:
- `type="button"` - Explicitly declares this is not a submit button
- `e.stopPropagation()` - Prevents the event from bubbling up to parent elements
- `e.preventDefault()` - Prevents any default browser behavior

### Button Layout Change
Using `flex flex-col items-center` on the button allows child `<span>` elements to stack vertically and remain centered, achieving the desired 2-line layout.
