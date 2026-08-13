# Move Earnings Summary Block to Top of Earnings Tab

## Goal
Reorder the Earnings tab UI so the "Available Earnings" summary block appears at the very top of the page, without changing any functionality, data fetching, or styling.

## Current Layout (in `src/components/UserEarningsTab.tsx`)
1. `PaymentStatus` (conditional)
2. `JackpotBreakdown`
3. Summary cards grid (Available Earnings / Total Earnings / Next Payout)
4. Secondary stats grid (Last 7 Days / Jackpot Tickets / Referrals)
5. Tabbed content (Pay Period History, Tips Received, Referrals, Events, Jackpot)

## Proposed Change
Move the existing summary cards grid (lines 1372–1463) and the secondary stats grid to render as the first element inside the main return container, before `PaymentStatus` and `JackpotBreakdown`.

## Files to Edit
- `src/components/UserEarningsTab.tsx`

## Implementation Details
- Cut the JSX block containing:
  - The 3-column grid with "Available Earnings", "Total Earnings", and "Next Payout" cards.
  - The 3-column grid with "Last 7 Days", "Jackpot Tickets", and "Referrals" cards.
- Paste it immediately after the opening `<div className="space-y-6">` and before the conditional `<PaymentStatus>` block.
- Leave `PaymentStatus`, `JackpotBreakdown`, and all tabbed content untouched.
- Do not modify any state, hooks, helper functions, or data fetching.

## Verification
- Confirm the component still compiles.
- Confirm the Earnings tab renders the summary cards first, followed by the existing sections in their original order.
