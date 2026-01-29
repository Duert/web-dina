-- FIX: Allow deletion of child records (responsibles/participants) to avoid duplicates

-- 1. Enable RLS (if not already enabled)
ALTER TABLE registration_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_participants ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for Responsibles
DROP POLICY IF EXISTS "Enable all for owners" ON registration_responsibles;
-- Simplest approach: Allow everything if the parent registration belongs to the user
CREATE POLICY "Enable all for owners" ON registration_responsibles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM registrations
            WHERE registrations.id = registration_responsibles.registration_id
            AND registrations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM registrations
            WHERE registrations.id = registration_responsibles.registration_id
            AND registrations.user_id = auth.uid()
        )
    );

-- 3. Create Policies for Participants
DROP POLICY IF EXISTS "Enable all for owners" ON registration_participants;
CREATE POLICY "Enable all for owners" ON registration_participants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM registrations
            WHERE registrations.id = registration_participants.registration_id
            AND registrations.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM registrations
            WHERE registrations.id = registration_participants.registration_id
            AND registrations.user_id = auth.uid()
        )
    );

-- 4. Also Ensure Registrations are deletable/updatable by owner (sanity check)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for owners" ON registrations;
CREATE POLICY "Enable all for owners" ON registrations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Needed for initial Insert where user_id might not be set in row yet? 
-- Actually, insert usually sets user_id. 
-- Let's allow INSERT for authenticated users generally if they set their own user_id.

DROP POLICY IF EXISTS "Enable insert for authenticated" ON registrations;
CREATE POLICY "Enable insert for authenticated" ON registrations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
