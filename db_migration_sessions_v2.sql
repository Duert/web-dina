-- Migration to update sessions to 4 slots for March 29, 2026

-- 1. Truncate existing sessions (Assuming we are resetting or updating)
TRUNCATE TABLE sessions CASCADE;

-- 2. Insert new sessions
INSERT INTO sessions (id, name, date, total_seats) VALUES
('morning-1', 'Sesión Mañana 1', '2026-03-29T10:00:00', 494),
('morning-2', 'Sesión Mañana 2', '2026-03-29T12:30:00', 494),
('afternoon-1', 'Sesión Tarde 1', '2026-03-29T16:30:00', 494),
('afternoon-2', 'Sesión Tarde 2', '2026-03-29T19:00:00', 494);
