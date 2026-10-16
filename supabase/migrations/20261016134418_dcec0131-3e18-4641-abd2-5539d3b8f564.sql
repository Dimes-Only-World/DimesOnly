CREATE TABLE public.email_suppressions (email text PRIMARY KEY, reason text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.email_suppressions TO service_role;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_suppressions FROM anon, authenticated;
CREATE POLICY "No direct access to email suppressions" ON public.email_suppressions FOR SELECT TO authenticated USING (false);
INSERT INTO public.email_suppressions (email, reason)
SELECT unnest(string_to_array('a@aol.com,asianets@aol.com,b@gmail.com,bkj@gmail.com,bla@gmail.com,blackjackelife@gmail.com,blag@gmail.com,blaqthoven747@gmail.com,blas@gmail.com,bria1250@gmail.com,chibuzorprince54@gmail.com,chibuzorprince6@gmail.com,drake@gmail.com,f@gmail.com,gendercheck@gmail.com,gyi@gmail.com,h@aol.com,h@gmail.com,hu@gmail.com,hy@gmail.com,kick@gmail.com,lokey@gmail.com,lokj@gmail.com,m.marielewis6@gmail.com,mnyeat@live.com,onelifeworldwide201@gmail.com,paradise@gmail.com,poopy@gmail.com,ppoll@gmail.com,rf@gmail.com,t@gmail.com,test3@gmail.com,testerprince68@gmail.com,tough@togh.com,trava0@gmail.com,typo@gmail.com', ',')), 'bounced (Mailtrap export 2026-10-14)'
ON CONFLICT DO NOTHING;