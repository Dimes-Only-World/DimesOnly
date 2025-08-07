-- Add Silver+ membership columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS silver_plus_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS silver_plus_joined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS silver_plus_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS silver_plus_membership_number INTEGER;
