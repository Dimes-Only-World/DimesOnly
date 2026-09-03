CREATE TABLE public.membership_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  tier text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  id_document_path text,
  selfie_path text,
  verification_status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.membership_agreements TO authenticated;
GRANT ALL ON public.membership_agreements TO service_role;

ALTER TABLE public.membership_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agreements"
ON public.membership_agreements FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own agreements"
ON public.membership_agreements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agreements"
ON public.membership_agreements FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_membership_agreements_updated_at
BEFORE UPDATE ON public.membership_agreements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_membership_agreements_tier_created ON public.membership_agreements (tier, created_at DESC);
