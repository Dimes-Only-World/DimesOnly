-- Events and PayPal Integration Database Setup
-- Run these commands in your Supabase SQL editor

-- Create payments table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  paypal_order_id VARCHAR(255),
  paypal_payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL, -- 'event_ticket', 'tip', etc.
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  referred_by VARCHAR(255), -- Username of referrer
  referrer_commission DECIMAL(10,2) DEFAULT 0,
  event_host_commission DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create commission payouts table for tracking commission payments
CREATE TABLE IF NOT EXISTS commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  commission_type VARCHAR(50) NOT NULL, -- 'referrer', 'event_host'
  amount DECIMAL(10,2) NOT NULL,
  payout_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  paypal_payout_batch_id VARCHAR(255),
  paypal_payout_item_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update events table to include max attendees
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER DEFAULT 100;

-- Update user_events table to track payment information
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free';
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255);
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Add PayPal email to users table for commission payouts
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_user_id ON commission_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_payment_id ON commission_payouts(payment_id);
CREATE INDEX IF NOT EXISTS idx_user_events_payment_id ON user_events(payment_id);

-- Enable Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments table
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payments" ON payments
  FOR UPDATE USING (true); -- Allow system updates via service role

-- RLS Policies for commission_payouts table
CREATE POLICY "Users can view their own commission payouts" ON commission_payouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage commission payouts" ON commission_payouts
  FOR ALL USING (true); -- Allow system management via service role

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_payouts_updated_at BEFORE UPDATE ON commission_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Verify the setup
SELECT 'Database setup completed successfully!' as status;
