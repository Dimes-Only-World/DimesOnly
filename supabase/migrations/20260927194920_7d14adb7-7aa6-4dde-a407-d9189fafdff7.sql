CREATE TABLE public.vehicle_purchase_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  applicant jsonb NOT NULL,
  residence jsonb NOT NULL,
  employment jsonb NOT NULL,
  co_buyer jsonb,
  interested_vehicle jsonb NOT NULL,
  trade_in jsonb,
  marketing_sms_consent boolean NOT NULL DEFAULT false,
  service_sms_consent boolean NOT NULL DEFAULT false,
  credit_authorization_consent boolean NOT NULL DEFAULT false,
  privacy_policy_consent boolean NOT NULL DEFAULT false,
  referrer_username text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_purchase_applications_status_valid CHECK (status IN ('new', 'reviewing', 'contacted', 'approved', 'declined', 'closed')),
  CONSTRAINT vehicle_purchase_applications_applicant_object CHECK (jsonb_typeof(applicant) = 'object'),
  CONSTRAINT vehicle_purchase_applications_residence_object CHECK (jsonb_typeof(residence) = 'object'),
  CONSTRAINT vehicle_purchase_applications_employment_object CHECK (jsonb_typeof(employment) = 'object'),
  CONSTRAINT vehicle_purchase_applications_interested_vehicle_object CHECK (jsonb_typeof(interested_vehicle) = 'object'),
  CONSTRAINT vehicle_purchase_applications_co_buyer_object CHECK (co_buyer IS NULL OR jsonb_typeof(co_buyer) = 'object'),
  CONSTRAINT vehicle_purchase_applications_trade_in_object CHECK (trade_in IS NULL OR jsonb_typeof(trade_in) = 'object')
);

GRANT ALL ON public.vehicle_purchase_applications TO service_role;

ALTER TABLE public.vehicle_purchase_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages purchase applications"
ON public.vehicle_purchase_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX vehicle_purchase_applications_vehicle_idx ON public.vehicle_purchase_applications(vehicle_id);
CREATE INDEX vehicle_purchase_applications_status_submitted_idx ON public.vehicle_purchase_applications(status, submitted_at DESC);

CREATE TRIGGER update_vehicle_purchase_applications_updated_at
BEFORE UPDATE ON public.vehicle_purchase_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();