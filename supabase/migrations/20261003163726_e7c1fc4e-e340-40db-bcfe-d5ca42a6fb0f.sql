CREATE POLICY "Extension records belong to their renter"
ON public.rental_extensions
FOR SELECT
TO authenticated
USING (auth.uid() = renter_user_id);