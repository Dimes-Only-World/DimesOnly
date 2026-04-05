
-- Add approval_status column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

-- Create performer_approvals table
CREATE TABLE public.performer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'not_approved')),
  reviewed_by uuid NOT NULL,
  reviewed_at timestamptz DEFAULT now(),
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performer_approvals ENABLE ROW LEVEL SECURITY;

-- Admin-only access via edge functions (no direct client access needed)
