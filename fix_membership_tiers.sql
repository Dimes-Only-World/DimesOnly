-- Fix Membership Tiers for Existing Users
-- This script will check and fix users who have incorrect membership_tier values

-- 1. Check current state
SELECT 
    username,
    membership_tier,
    membership_type,
    silver_plus_active,
    diamond_plus_active,
    created_at
FROM users 
WHERE membership_tier != 'free' 
   OR membership_type != 'free'
ORDER BY created_at DESC;

-- 2. Fix users who should be free (new users without upgrades)
UPDATE users 
SET 
    membership_tier = 'free',
    membership_type = 'free'
WHERE 
    (membership_tier = 'silver' OR membership_type = 'silver')
    AND silver_plus_active = false
    AND diamond_plus_active = false
    AND created_at > '2024-01-01'; -- Adjust date as needed

-- 3. Verify the fix
SELECT 
    username,
    membership_tier,
    membership_type,
    silver_plus_active,
    diamond_plus_active,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 10;
