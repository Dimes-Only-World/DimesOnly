CREATE TABLE public.rental_call_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Pacific Time - US & Canada',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.rental_call_requests TO anon;
GRANT INSERT ON public.rental_call_requests TO authenticated;
GRANT ALL ON public.rental_call_requests TO service_role;
ALTER TABLE public.rental_call_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a call" ON public.rental_call_requests FOR INSERT TO anon, authenticated WITH CHECK (true);