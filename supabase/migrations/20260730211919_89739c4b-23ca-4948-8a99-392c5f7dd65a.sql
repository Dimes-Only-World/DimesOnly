UPDATE public.users SET approval_status = 'pending' WHERE approval_status IS NULL OR approval_status NOT IN ('pending','approved','denied');

ALTER TABLE public.users ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_approval_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_approval_status_check CHECK (approval_status IN ('pending','approved','denied'));