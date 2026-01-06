-- Add RLS policy allowing admins to delete all ratings (for reset functionality)
CREATE POLICY "Admins can delete all ratings" 
ON public.ratings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);