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

-- Payout Requests Table for handling user payout preferences
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('cashapp', 'paypal', 'wire', 'check')),
    
    -- PayPal payout info
    paypal_email TEXT,
    
    -- CashApp payout info  
    cashapp_cashtag TEXT,
    cashapp_phone TEXT,
    cashapp_email TEXT,
    
    -- Wire transfer info
    wire_bank_name TEXT,
    wire_routing_number TEXT,
    wire_account_number TEXT,
    wire_account_holder_name TEXT,
    wire_account_type TEXT CHECK (wire_account_type IN ('checking', 'savings')),
    wire_bank_address TEXT,
    wire_swift_code TEXT,
    
    -- Check by mail info
    check_full_name TEXT,
    check_address_line1 TEXT,
    check_address_line2 TEXT,
    check_city TEXT,
    check_state TEXT,
    check_zip_code TEXT,
    check_country TEXT DEFAULT 'United States',
    
    -- Request status and processing
    request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_date TIMESTAMP WITH TIME ZONE,
    scheduled_payout_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_payout_date ON payout_requests(scheduled_payout_date);

-- Add constraint to ensure required fields are present based on payout method
CREATE OR REPLACE FUNCTION validate_payout_method_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate PayPal
    IF NEW.payout_method = 'paypal' THEN
        IF NEW.paypal_email IS NULL OR NEW.paypal_email = '' THEN
            RAISE EXCEPTION 'PayPal email is required for PayPal payouts';
        END IF;
    END IF;
    
    -- Validate CashApp
    IF NEW.payout_method = 'cashapp' THEN
        IF NEW.cashapp_cashtag IS NULL OR NEW.cashapp_cashtag = '' THEN
            RAISE EXCEPTION 'CashApp $cashtag is required for CashApp payouts';
        END IF;
    END IF;
    
    -- Validate Wire Transfer
    IF NEW.payout_method = 'wire' THEN
        IF NEW.wire_bank_name IS NULL OR NEW.wire_routing_number IS NULL OR 
           NEW.wire_account_number IS NULL OR NEW.wire_account_holder_name IS NULL THEN
            RAISE EXCEPTION 'All wire transfer fields are required for wire payouts';
        END IF;
    END IF;
    
    -- Validate Check by Mail
    IF NEW.payout_method = 'check' THEN
        IF NEW.check_full_name IS NULL OR NEW.check_address_line1 IS NULL OR 
           NEW.check_city IS NULL OR NEW.check_state IS NULL OR NEW.check_zip_code IS NULL THEN
            RAISE EXCEPTION 'All address fields are required for check payouts';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_payout_method_trigger
    BEFORE INSERT OR UPDATE ON payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_payout_method_fields();

-- Tips table for individual tip transactions
CREATE TABLE IF NOT EXISTS tips_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipper_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tipped_username TEXT NOT NULL,
    tipped_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tip details
    tip_amount DECIMAL(10,2) NOT NULL,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Payment details
    payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'debit_card', 'credit_card')),
    payment_id UUID REFERENCES payments(id),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- PayPal specific
    paypal_order_id TEXT,
    paypal_payment_id TEXT,
    
    -- Card payment specific (for Stripe or other processor)
    card_payment_intent_id TEXT,
    card_last_four TEXT,
    card_brand TEXT,
    
    -- Referral tracking
    referrer_username TEXT,
    referrer_commission DECIMAL(10,2) DEFAULT 0,
    
    -- Jackpot tickets
    tickets_generated INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for tips
CREATE INDEX IF NOT EXISTS idx_tips_transactions_tipper ON tips_transactions(tipper_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_transactions_tipped ON tips_transactions(tipped_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_transactions_tipped_username ON tips_transactions(tipped_username);
CREATE INDEX IF NOT EXISTS idx_tips_transactions_status ON tips_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_tips_transactions_created ON tips_transactions(created_at);

-- Function to calculate next payout date (1st or 15th)
CREATE OR REPLACE FUNCTION calculate_next_payout_date()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    current_date TIMESTAMP WITH TIME ZONE := NOW();
    current_day INTEGER := EXTRACT(DAY FROM current_date);
    current_month INTEGER := EXTRACT(MONTH FROM current_date);
    current_year INTEGER := EXTRACT(YEAR FROM current_date);
    next_payout TIMESTAMP WITH TIME ZONE;
BEGIN
    -- If today is before the 1st or on the 1st, next payout is the 1st
    IF current_day <= 1 THEN
        next_payout := make_date(current_year, current_month, 1)::TIMESTAMP WITH TIME ZONE;
    -- If today is before the 15th or on the 15th, next payout is the 15th
    ELSIF current_day <= 15 THEN
        next_payout := make_date(current_year, current_month, 15)::TIMESTAMP WITH TIME ZONE;
    -- Otherwise, next payout is the 1st of next month
    ELSE
        IF current_month = 12 THEN
            next_payout := make_date(current_year + 1, 1, 1)::TIMESTAMP WITH TIME ZONE;
        ELSE
            next_payout := make_date(current_year, current_month + 1, 1)::TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
    
    RETURN next_payout;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_payout_requests_updated_at
    BEFORE UPDATE ON payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tips_transactions_updated_at
    BEFORE UPDATE ON tips_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Database setup completed successfully!' as status;

-- Membership System Setup for Diamond Plus Program
-- Add this to your existing database setup

-- Add new fields to users table for membership system
ALTER TABLE users ADD COLUMN IF NOT EXISTS diamond_plus_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS diamond_plus_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS diamond_plus_payment_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_count_position INTEGER; -- Position in the 300/700/3000 counts
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20); -- Required for PayPal collection
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notarization_completed BOOLEAN DEFAULT FALSE;

-- Create membership upgrade payments table
CREATE TABLE IF NOT EXISTS membership_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  upgrade_type VARCHAR(50) NOT NULL, -- 'diamond_plus'
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'paypal_full', 'paypal_installment'
  installment_plan BOOLEAN DEFAULT FALSE,
  installment_count INTEGER DEFAULT 1,
  installments_paid INTEGER DEFAULT 0,
  
  -- PayPal details
  paypal_order_id VARCHAR(255),
  paypal_payment_id VARCHAR(255),
  phone_number VARCHAR(20),
  
  -- Status tracking
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'partial'
  upgrade_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'cancelled'
  
  -- Agreement tracking
  agreement_sent BOOLEAN DEFAULT FALSE,
  agreement_signed BOOLEAN DEFAULT FALSE,
  notarization_scheduled BOOLEAN DEFAULT FALSE,
  notarization_completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create membership limits tracking table
CREATE TABLE IF NOT EXISTS membership_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_type VARCHAR(50) NOT NULL, -- 'silver', 'diamond', 'diamond_plus'
  user_type VARCHAR(50) NOT NULL, -- 'normal', 'stripper', 'exotic'
  current_count INTEGER DEFAULT 0,
  max_count INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(membership_type, user_type)
);

-- Initialize membership limits
INSERT INTO membership_limits (membership_type, user_type, current_count, max_count) 
VALUES 
  ('silver', 'normal', 0, 3000),
  ('diamond', 'stripper', 0, 700),
  ('diamond', 'exotic', 0, 700),
  ('diamond_plus', 'stripper', 0, 300),
  ('diamond_plus', 'exotic', 0, 300)
ON CONFLICT (membership_type, user_type) DO NOTHING;

-- Create quarterly requirements tracking table for Diamond Plus members
CREATE TABLE IF NOT EXISTS quarterly_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quarter INTEGER NOT NULL, -- 1, 2, 3, 4
  year INTEGER NOT NULL,
  
  -- Weekly referrals (7 per week, 84 per quarter)
  weekly_referrals_completed INTEGER DEFAULT 0,
  weekly_referrals_required INTEGER DEFAULT 84,
  
  -- Weekly content uploads (7 per week, 168 per quarter)  
  weekly_content_completed INTEGER DEFAULT 0,
  weekly_content_required INTEGER DEFAULT 168,
  
  -- Event participation (1 per month, 3 per quarter)
  events_attended INTEGER DEFAULT 0,
  events_required INTEGER DEFAULT 3,
  
  -- New user messages (7 per week, 84 per quarter)
  weekly_messages_completed INTEGER DEFAULT 0,
  weekly_messages_required INTEGER DEFAULT 84,
  
  -- Platform earnings check
  platform_earnings DECIMAL(10,2) DEFAULT 0,
  earnings_threshold DECIMAL(10,2) DEFAULT 12000,
  
  -- Payout calculation
  base_payout DECIMAL(10,2) DEFAULT 6250,
  deductions DECIMAL(10,2) DEFAULT 0,
  final_payout DECIMAL(10,2) DEFAULT 6250,
  payout_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'calculated', 'paid'
  
  -- Guarantee status
  guarantee_active BOOLEAN DEFAULT TRUE,
  guarantee_voided_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quarter, year)
);

-- Create installment payments tracking table
CREATE TABLE IF NOT EXISTS installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_upgrade_id UUID REFERENCES membership_upgrades(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL, -- 1 or 2
  amount DECIMAL(10,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- PayPal details
  paypal_order_id VARCHAR(255),
  paypal_payment_id VARCHAR(255),
  
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'overdue'
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_upgrades_user_id ON membership_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_upgrades_status ON membership_upgrades(payment_status, upgrade_status);
CREATE INDEX IF NOT EXISTS idx_quarterly_requirements_user_quarter ON quarterly_requirements(user_id, quarter, year);
CREATE INDEX IF NOT EXISTS idx_installment_payments_upgrade_id ON installment_payments(membership_upgrade_id);
CREATE INDEX IF NOT EXISTS idx_users_membership_tier ON users(membership_tier);
CREATE INDEX IF NOT EXISTS idx_users_diamond_plus ON users(diamond_plus_active);

-- Enable Row Level Security
ALTER TABLE membership_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_upgrades
CREATE POLICY "Users can view their own membership upgrades" ON membership_upgrades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own membership upgrades" ON membership_upgrades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update membership upgrades" ON membership_upgrades
  FOR UPDATE USING (true); -- Allow system updates

-- RLS Policies for quarterly_requirements
CREATE POLICY "Users can view their own quarterly requirements" ON quarterly_requirements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage quarterly requirements" ON quarterly_requirements
  FOR ALL USING (true); -- Allow system management

-- RLS Policies for installment_payments
CREATE POLICY "Users can view their installment payments" ON installment_payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM membership_upgrades WHERE id = installment_payments.membership_upgrade_id
    )
  );

-- RLS Policies for membership_limits (read-only for users)
CREATE POLICY "Anyone can view membership limits" ON membership_limits
  FOR SELECT USING (true);

-- Create function to automatically assign membership on user registration
CREATE OR REPLACE FUNCTION assign_membership_on_registration()
RETURNS TRIGGER AS $$
DECLARE
  silver_limit INTEGER;
  diamond_stripper_limit INTEGER;
  diamond_exotic_limit INTEGER;
  current_silver_count INTEGER;
  current_diamond_stripper_count INTEGER;
  current_diamond_exotic_count INTEGER;
BEGIN
  -- Get current limits and counts
  SELECT max_count, current_count INTO silver_limit, current_silver_count
  FROM membership_limits 
  WHERE membership_type = 'silver' AND user_type = 'normal';
  
  SELECT max_count, current_count INTO diamond_stripper_limit, current_diamond_stripper_count
  FROM membership_limits 
  WHERE membership_type = 'diamond' AND user_type = 'stripper';
  
  SELECT max_count, current_count INTO diamond_exotic_limit, current_diamond_exotic_count
  FROM membership_limits 
  WHERE membership_type = 'diamond' AND user_type = 'exotic';
  
  -- Assign membership based on user_type and availability
  IF NEW.user_type = 'normal' AND current_silver_count < silver_limit THEN
    NEW.membership_tier := 'silver';
    NEW.membership_type := 'silver';
    -- Update count
    UPDATE membership_limits 
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE membership_type = 'silver' AND user_type = 'normal';
    
  ELSIF NEW.user_type = 'stripper' AND current_diamond_stripper_count < diamond_stripper_limit THEN
    NEW.membership_tier := 'diamond';
    NEW.membership_type := 'diamond';
    -- Update count
    UPDATE membership_limits 
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE membership_type = 'diamond' AND user_type = 'stripper';
    
  ELSIF NEW.user_type = 'exotic' AND current_diamond_exotic_count < diamond_exotic_limit THEN
    NEW.membership_tier := 'diamond';
    NEW.membership_type := 'diamond';
    -- Update count
    UPDATE membership_limits 
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE membership_type = 'diamond' AND user_type = 'exotic';
    
  ELSE
    -- Default membership if limits are reached
    NEW.membership_tier := 'basic';
    NEW.membership_type := 'basic';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic membership assignment
DROP TRIGGER IF EXISTS trigger_assign_membership ON users;
CREATE TRIGGER trigger_assign_membership
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_membership_on_registration();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_membership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on new tables
CREATE TRIGGER update_membership_upgrades_updated_at BEFORE UPDATE ON membership_upgrades
    FOR EACH ROW EXECUTE FUNCTION update_membership_updated_at();

CREATE TRIGGER update_membership_limits_updated_at BEFORE UPDATE ON membership_limits
    FOR EACH ROW EXECUTE FUNCTION update_membership_updated_at();

CREATE TRIGGER update_quarterly_requirements_updated_at BEFORE UPDATE ON quarterly_requirements
    FOR EACH ROW EXECUTE FUNCTION update_membership_updated_at();

SELECT 'Membership system setup completed successfully!' as status;
