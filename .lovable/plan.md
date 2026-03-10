

# Payouts Tab: Mobile Responsive + Approve All Button

## Changes to `src/components/AdminPayoutTab.tsx`

### 1. Mobile-responsive table
Replace the HTML table with a **card-based layout on mobile**, table on desktop — following the project's existing responsive pattern:
- On mobile (`sm` and below): Each payout renders as a stacked card showing user, amount, method, status, and action buttons vertically
- On desktop (`md+`): Keep the current table layout but hide secondary columns (Details, Requested, Scheduled) with `hidden md:table-cell`

### 2. "Approve All" button
Add an "Approve All" button above the table that:
- Only appears when there are pending requests in the current filtered list
- Loops through all filtered pending requests and calls `approvePayoutRequest` for each
- Shows a loading state during bulk processing
- Refreshes the list after completion

### Files to modify
- `src/components/AdminPayoutTab.tsx` — add mobile card layout, hide secondary table columns on small screens, add Approve All button with bulk action handler

