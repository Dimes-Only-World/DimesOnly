-- Remove anonymous write access to site video configuration/history.
DROP POLICY IF EXISTS "anon_write_page_videos" ON public.page_videos;
DROP POLICY IF EXISTS "anon_write_video_history" ON public.page_video_history;

-- Payment state changes must happen through trusted server-side flows, not browser clients.
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

-- Remove overly broad event registration access while preserving existing owner/admin policies.
DROP POLICY IF EXISTS "Admin can delete  event selections" ON public.user_events;
DROP POLICY IF EXISTS "Allow reading event selections by username" ON public.user_events;
DROP POLICY IF EXISTS "Users can view their own event selections" ON public.user_events;

CREATE POLICY "Admins can view event selections"
ON public.user_events
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Weekly earnings are created/updated by trusted server-side functions or service-role clients only.
DROP POLICY IF EXISTS "System can insert earnings" ON public.weekly_earnings;
DROP POLICY IF EXISTS "System can update earnings" ON public.weekly_earnings;