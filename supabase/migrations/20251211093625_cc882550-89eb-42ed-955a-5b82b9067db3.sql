-- Drop and recreate the view with username and profile_photo columns
DROP VIEW IF EXISTS v_jackpot_latest_winners;

CREATE VIEW v_jackpot_latest_winners WITH (security_invoker = false) AS
SELECT 
    w.draw_id,
    d.executed_at,
    w.user_id,
    w.username,
    w.profile_photo,
    w.place,
    w.percentage,
    w.amount,
    d.drawn_code,
    w.role,
    w.status
FROM jackpot_winners w
JOIN jackpot_draws d ON w.draw_id = d.id
ORDER BY d.executed_at DESC, w.place;

-- Grant access to all users
GRANT SELECT ON v_jackpot_latest_winners TO anon, authenticated;