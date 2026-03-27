-- Migration: Add 4 Block Sessions
-- This migration adds 4 separate sessions for the 4 blocks instead of just morning/afternoon

-- First, remove old sessions if they exist
DELETE FROM sessions WHERE id IN ('morning', 'afternoon');

-- Add 4 block sessions
INSERT INTO sessions (id, name, date, total_seats) VALUES 
('block1', 'Bloque 1 (Mañana 1)', '2026-06-20 10:00:00+00', 961),
('block2', 'Bloque 2 (Mañana 2)', '2026-06-20 12:30:00+00', 961),
('block3', 'Bloque 3 (Tarde 1)', '2026-06-20 16:00:00+00', 961),
('block4', 'Bloque 4 (Tarde 2)', '2026-06-20 18:30:00+00', 961)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  total_seats = EXCLUDED.total_seats;
