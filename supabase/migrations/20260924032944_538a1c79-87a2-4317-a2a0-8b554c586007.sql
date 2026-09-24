CREATE TABLE public.host_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city_state_zip text NOT NULL,
  drivers_license_no text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year text NOT NULL,
  color text,
  vin text NOT NULL,
  license_plate text,
  mileage text,
  earnings_plan text NOT NULL CHECK (earnings_plan IN ('50','60')),
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  drivers_license_path text,
  registration_path text,
  signature_path text,
  signed_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  deposit_amount numeric NOT NULL DEFAULT 250,
  deposit_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.host_applications TO anon, authenticated;
GRANT ALL ON public.host_applications TO service_role;
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a host application" ON public.host_applications
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new' AND deposit_status = 'pending');
CREATE TRIGGER host_applications_updated_at BEFORE UPDATE ON public.host_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can upload host documents" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'host-documents');