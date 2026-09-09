UPDATE public.rental_commissions AS u
SET amount = d.amount * 0.5
FROM public.rental_commissions AS d
WHERE u.booking_id = d.booking_id
  AND u.commission_type = 'upline'
  AND d.commission_type = 'direct'
  AND u.amount != d.amount * 0.5;