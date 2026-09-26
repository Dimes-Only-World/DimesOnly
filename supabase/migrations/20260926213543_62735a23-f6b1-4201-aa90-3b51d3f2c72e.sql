CREATE TABLE public.flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.flyers TO service_role;
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages flyers" ON public.flyers FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.flyers (title, image_url, sort_order)
VALUES ('Dimes Only World — Now Recruiting', '/__l5e/assets-v1/9d238661-be05-4b8c-9943-06e943607d38/dimes-only-world-flyer.png', 1);

CREATE TABLE public.qr_code_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  paypal_order_id text UNIQUE,
  paypal_capture_id text,
  amount numeric NOT NULL DEFAULT 1.99,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.qr_code_purchases TO service_role;
ALTER TABLE public.qr_code_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages qr purchases" ON public.qr_code_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX qr_code_purchases_user_idx ON public.qr_code_purchases(user_id, status);

INSERT INTO public.page_videos (page_key, video_url)
SELECT 'make_money_banner', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/0415+(1).mp4'
WHERE NOT EXISTS (SELECT 1 FROM public.page_videos WHERE page_key = 'make_money_banner');