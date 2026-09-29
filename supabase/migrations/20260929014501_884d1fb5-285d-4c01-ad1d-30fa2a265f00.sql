CREATE TABLE public.reward_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_amount numeric NOT NULL DEFAULT 0,
  prize_label text,
  category text NOT NULL,
  contest_type text NOT NULL DEFAULT 'most',
  goal integer,
  audience text[] NOT NULL DEFAULT ARRAY['dimes','male','normal_female','business_owner'],
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  winner_user_id uuid,
  winner_score numeric,
  won_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reward_contests TO service_role;
ALTER TABLE public.reward_contests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reward_contests_updated_at BEFORE UPDATE ON public.reward_contests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();