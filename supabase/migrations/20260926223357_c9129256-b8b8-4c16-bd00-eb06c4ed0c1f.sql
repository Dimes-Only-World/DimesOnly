CREATE TABLE public.make_money_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.make_money_messages TO service_role;

ALTER TABLE public.make_money_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages make money messages"
ON public.make_money_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_make_money_messages_updated_at
BEFORE UPDATE ON public.make_money_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.make_money_messages (title, body, sort_order, is_active)
VALUES (
  'Ready-to-Send Message',
  'Want to actually get paid for recruiting baddies that got hot photos and videos?\n\nWatch this quick video first:\nhttps://dimesonlyworld.s3.us-east-2.amazonaws.com/Exs+Commercial(1)+(1).webm\n\nIf it hits different… click the link below and lock in your free account right now.\nSpots are limited before the app officially launches.\nIt’s 100% free to join — zero risk, nothing to lose.\nDon’t sleep on this one. Can you find Dimes Only right now? If so join, it will pay serious EASY money!',
  1,
  true
);