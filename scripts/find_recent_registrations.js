
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findRecent() {
    console.log("Listing recent registrations...");

    const { data: recents, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) console.error("Error listing recents:", error);
    else {
        console.log(`Found ${recents.length} recent registrations:`);
        recents.forEach(reg => {
            console.log(` - ${reg.group_name} (${reg.school_name}) - Status: ${reg.status} - ID: ${reg.id} - Created: ${reg.created_at}`);
        });
    }
}

findRecent();
