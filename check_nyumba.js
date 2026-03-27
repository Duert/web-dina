
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://ftfdblgisxzsffqbxrkx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ'
);

async function checkDetails() {
    const regId = '4a297cfd-2574-4b09-9cba-0cb7cd2427eb';
    console.log(`Checking details for registrationId: ${regId}`);

    const { data: participants, error: pErr } = await supabase
        .from('registration_participants')
        .select('*')
        .eq('registration_id', regId);

    const { data: responsibles, error: rErr } = await supabase
        .from('registration_responsibles')
        .select('*')
        .eq('registration_id', regId);

    if (pErr) console.error("Participant Error:", pErr);
    if (rErr) console.error("Responsible Error:", rErr);

    console.log("Participants count:", participants?.length || 0);
    console.log("Responsibles count:", responsibles?.length || 0);
}

checkDetails();
