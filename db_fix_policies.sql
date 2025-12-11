-- FIX: Add missing SELECT policies for related tables
-- Without these, the join queries in the Admin Dashboard fail or return no data for relations.

CREATE POLICY "Allow public read responsibles" 
ON registration_responsibles FOR SELECT USING (true);

CREATE POLICY "Allow public read participants" 
ON registration_participants FOR SELECT USING (true);
