-- Update all existing events to have free_normal = 10
UPDATE public.events SET free_normal = 10 WHERE free_normal IS NULL OR free_normal != 10;

-- Set default value for free_normal column to 10
ALTER TABLE public.events ALTER COLUMN free_normal SET DEFAULT 10;