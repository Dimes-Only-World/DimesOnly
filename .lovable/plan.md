

## Problem

Admin direct messages are silently failing because:

1. **RLS INSERT policy** on `direct_messages` requires `sender_id = auth.uid()`. The admin dashboard uses custom auth (not Supabase Auth), so `auth.uid()` is null. The insert sets `sender_id: null`, which doesn't match, so the insert is rejected.
2. **User message view** groups conversations by the non-current-user ID from `sender_id`/`recipient_id`. A null `sender_id` means admin messages won't appear in conversations even if they were inserted.

## Fix

Route admin messages through an edge function that uses the service role to bypass RLS, and set a recognizable admin sender ID. On the user side, handle admin messages with a fallback display.

### 1. Create edge function `send-admin-message`

**File:** `supabase/functions/send-admin-message/index.ts`

- Accept `{ adminUserId, recipientIds, message }` in POST body
- Verify admin status server-side via `check_admin_by_user_id()` RPC (existing pattern)
- Use service-role Supabase client to insert into `direct_messages` with `sender_id = adminUserId`, `is_admin_message = true`
- Also insert notifications for each recipient
- Return success/failure counts

### 2. Update `AdminDirectMessageTab.tsx`

- Replace direct `supabase.from("direct_messages").insert(...)` with a call to `supabase.functions.invoke("send-admin-message", { body: { adminUserId, recipientIds: selectedUsers, message } })`
- Remove the separate notification insert logic (edge function handles it)

### 3. Update `UserDirectMessagesTab.tsx`

- In `fetchMessages`, handle messages where `sender_id` is the admin user ID and `is_admin_message = true`
- Show "Admin" as the username with a distinct badge when displaying admin conversations

This ensures messages are inserted with proper authorization and appear correctly in the user's inbox.

