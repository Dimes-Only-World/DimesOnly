ALTER TABLE public.short_form_backgrounds ADD COLUMN IF NOT EXISTS page TEXT NOT NULL DEFAULT 'short_form';
ALTER TABLE public.short_form_backgrounds DROP CONSTRAINT IF EXISTS short_form_backgrounds_page_check;
ALTER TABLE public.short_form_backgrounds ADD CONSTRAINT short_form_backgrounds_page_check CHECK (page IN ('short_form','login'));
ALTER TABLE public.short_form_backgrounds DROP CONSTRAINT IF EXISTS short_form_backgrounds_device_check;
ALTER TABLE public.short_form_backgrounds ADD CONSTRAINT short_form_backgrounds_device_check CHECK (device IN ('desktop','tablet','mobile'));