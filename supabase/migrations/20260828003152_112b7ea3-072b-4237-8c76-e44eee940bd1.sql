GRANT DELETE ON public.direct_messages TO authenticated;
CREATE POLICY "direct_messages_delete_sender" ON public.direct_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());