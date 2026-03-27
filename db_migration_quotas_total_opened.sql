-- Migration to add total_opened to category_quotas
ALTER TABLE public.category_quotas ADD COLUMN IF NOT EXISTS total_opened integer NOT NULL DEFAULT 0;

-- Initialize total_opened with current available_spots
UPDATE public.category_quotas SET total_opened = available_spots;
