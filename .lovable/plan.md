

# Admin Performer Approval System — Email Notifications (not SMS)

## Change from Previous Plan
Instead of sending SMS via Twilio to users' phone numbers, we will send an **email with a video link** to their Gmail/email address on file, using the existing **Mailtrap** email integration already in the project.

This removes the need for Twilio entirely.

## Database Changes (1 migration)

- Add `approval_status` column (text, default 'pending') to `users` table
- Create `performer_approvals` table: `id`, `user_id`, `status`, `reviewed_by`, `reviewed_at`, `email_sent` (boolean), `created_at`

## Edge Function: `admin-data/index.ts` (update)

Add 3 new actions using the existing Mailtrap email pattern already in this file:

- **`fetchPendingApprovals`** — query users where `user_type IN ('stripper','exotic')` and `approval_status = 'pending'`
- **`approvePerformer`** — sets `approval_status = 'approved'`, inserts `performer_approvals` record, sends email via Mailtrap:
  - Subject: "Dimes Only World — You're Approved!"
  - Body includes video link: "Vid3o.mp4 Dimes Only World. Watch video!" with link to upgrade page
  - Does NOT auto-upgrade — user chooses to purchase Diamond+ themselves
- **`rejectPerformer`** — sets `approval_status = 'not_approved'`, inserts record, sends email via Mailtrap:
  - Subject: "Dimes Only World — Next Steps"
  - Body: "DimesOnly.World watch Video for next step" with video link

No new edge function needed — reuses the Mailtrap setup already in `admin-data`.

## Frontend: `AdminApprovalsTab.tsx` (new)

- Lists pending stripper/exotic users with profile photo, username, email, user type
- **Approve** (green) and **Not Approved** (red) buttons per user
- History section showing already-reviewed users with status badges
- Toast notifications on success/failure

## Frontend: `AdminDashboard.tsx` (update)

- Add 12th tab "Approvals" with the new `AdminApprovalsTab` component

## Frontend: `AdminUserDetailsEnhanced.tsx` (update)

- Show approval status badge for stripper/exotic users
- Add Approve / Not Approved buttons when status is 'pending'

## Files Summary
1. **Migration**: add `approval_status` to users, create `performer_approvals` table
2. **Edit**: `supabase/functions/admin-data/index.ts` — add 3 actions with Mailtrap email
3. **New**: `src/components/AdminApprovalsTab.tsx`
4. **Edit**: `src/pages/AdminDashboard.tsx` — add Approvals tab
5. **Edit**: `src/components/AdminUserDetailsEnhanced.tsx` — status badge + buttons

