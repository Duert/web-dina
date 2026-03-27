const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addMeri() {
    const { data: existing } = await supabase.from('registrations')
        .select('user_id, status, is_confirmed')
        .eq('is_confirmed', true)
        .limit(1);
    
    if (!existing || existing.length === 0) {
       console.log("No existing confirmed reg found");
    }

    const validStatus = existing[0].status;
    console.log("Using status:", validStatus);

    console.log("Adding Meri Iznajar...");
    const { data, error } = await supabase
        .from('registrations')
        .insert([{
            group_name: "Meri Iznajar",
            school_name: "Independiente",
            category: "Solistas Absoluta",
            status: validStatus,
            is_confirmed: true,
            user_id: existing[0].user_id
        }])
        .select('*');

    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Success! Inserted:", data[0].id);
    }
}

addMeri();
