CREATE TABLE public.short_form_backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device TEXT NOT NULL CHECK (device IN ('desktop','mobile')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.short_form_backgrounds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_form_backgrounds TO authenticated;
GRANT ALL ON public.short_form_backgrounds TO service_role;

ALTER TABLE public.short_form_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view short form backgrounds"
ON public.short_form_backgrounds FOR SELECT USING (true);

CREATE POLICY "Admins manage short form backgrounds"
ON public.short_form_backgrounds FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());