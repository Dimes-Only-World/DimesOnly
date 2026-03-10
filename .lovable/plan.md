

# Admin Payout Management Tab

## What we're building
A new "Payouts" tab in the Admin Dashboard where admins can view all payout requests, see user details and payout method info, and approve/reject requests. Plus backend support via the existing `admin-data` edge function.

## Changes

### 1. Add payout actions to `admin-data` edge function
Add three new actions to `supabase/functions/admin-data/index.ts`:
- **`fetchPayoutRequests`** — Fetches all payout requests joined with user info (username, email) from the `payout_requests` and `users` tables, ordered by newest first
- **`approvePayoutRequest`** — Updates `request_status` to `'approved'`, sets `processed_date`, and optionally adds admin notes
- **`rejectPayoutRequest`** — Updates `request_status` to `'rejected'`, sets `processed_date`, and adds rejection reason as notes
- **`markPayoutPaid`** — Updates `request_status` to `'paid'` and sets `processed_date`

### 2. Create `src/components/AdminPayoutTab.tsx`
New component with:
- **Summary cards**: Total pending count/amount, approved count/amount, paid count/amount
- **Filter controls**: Filter by status (all/pending/approved/rejected/paid), search by username
- **Payout requests table** showing: username, amount, payout method, method details (PayPal email, Venmo handle, bank info, check address), request date, scheduled payout date, status badge, action buttons
- **Action buttons**: Approve, Reject (with reason dialog), Mark as Paid
- **Payout method detail display**: Expandable row or dialog showing full method details (routing numbers, addresses, etc.)

### 3. Update `src/pages/AdminDashboard.tsx`
- Import `AdminPayoutTab`
- Add "Payouts" tab trigger (update grid to `lg:grid-cols-11`)
- Add `TabsContent` for payouts

### Files to modify
- `supabase/functions/admin-data/index.ts` — add 4 new action cases
- `src/components/AdminPayoutTab.tsx` — new file
- `src/pages/AdminDashboard.tsx` — add tab

