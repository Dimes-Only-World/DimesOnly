-- Add media attachment columns to direct messages
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS media_storage_path TEXT;

-- Ensure participants can read and create their own direct messages
DROP POLICY IF EXISTS "direct_messages_select_participants" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert_sender" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_update_read" ON public.direct_messages;

CREATE POLICY "direct_messages_select_participants"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "direct_messages_insert_sender"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "direct_messages_update_read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Allow DM participants to read attached private-media objects
DROP POLICY IF EXISTS "dm_media_participant_read" ON storage.objects;

CREATE POLICY "dm_media_participant_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-media'
    AND EXISTS (
      SELECT 1 FROM public.direct_messages
      WHERE media_storage_path = name
        AND (sender_id = auth.uid() OR recipient_id = auth.uid())
    )
  );