# Delete Leads with a Trash / Permanent Delete Area

Add two-stage deletion to the Admin Leads tab: leads first move to a Trash area, then can be permanently removed (or restored).

## What you get

- **Delete button** on every lead row in the main Leads list. It moves the lead to Trash (it disappears from the active list but nothing is lost yet).
- **Two views** in the Leads tab: "Active Leads" and "Trash", switchable with tabs. Trash shows when each lead was deleted.
- **In Trash**: each lead has "Restore" (back to active) and "Delete Permanently" (irreversible, with a confirmation dialog).
- **Empty Trash** button to permanently remove everything in Trash at once, also behind a confirmation.
- Bulk select via checkboxes so several leads can be deleted/restored at once.

## Technical notes

1. **Database migration**: add `deleted_at timestamptz null` to `age_gate_leads` (soft-delete marker). No other schema changes needed.
2. **Edge function** `supabase/functions/admin-data/index.ts`:
   - `fetchAgeGateLeads` accepts an `includeDeleted`/`view` param — returns rows where `deleted_at is null` for active, `deleted_at is not null` for trash.
   - New admin-only actions: `softDeleteAgeGateLeads(ids)`, `restoreAgeGateLeads(ids)`, `permanentlyDeleteAgeGateLeads(ids)`, `emptyAgeGateLeadsTrash()`. All go through the existing admin verification path already used by this function.
3. **UI** `src/components/AdminLeadsTab.tsx`: add Tabs (Active / Trash), row checkboxes, trash icon per row, and confirmation dialogs (shadcn `AlertDialog`) for permanent actions. Search continues to work in both views. Toast feedback on each action.
