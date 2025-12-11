-- FIX: Add missing SELECT policies for related tables (Robust Version)

-- 1. Drop policies if they already exist (to avoid errors)
DROP POLICY IF EXISTS "Allow public read responsibles" ON registration_responsibles;
DROP POLICY IF EXISTS "Allow public read participants" ON registration_participants;

-- 2. Re-create them
CREATE POLICY "Allow public read responsibles" 
ON registration_responsibles FOR SELECT USING (true);

CREATE POLICY "Allow public read participants" 
ON registration_participants FOR SELECT USING (true);
