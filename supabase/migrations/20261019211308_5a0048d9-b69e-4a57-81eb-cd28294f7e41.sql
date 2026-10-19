alter table public.rental_bookings
  add column if not exists return_mileage integer,
  add column if not exists return_fuel text,
  add column if not exists return_damage_notes text,
  add column if not exists return_photo_paths text[] not null default '{}',
  add column if not exists late_fee_charged numeric not null default 0,
  add column if not exists deposit_kept numeric not null default 0,
  add column if not exists deposit_refunded numeric not null default 0;