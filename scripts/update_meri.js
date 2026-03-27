const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateMeri() {
    console.log("Updating Meri Iznajar school...");
    const { data, error } = await supabase
        .from('registrations')
        .update({ school_name: "Centro Adhara" })
        .eq('group_name', 'Meri Iznajar')
        .select('*');

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("Success! Updated:", data[0]?.id, "to school:", data[0]?.school_name);
    }
}

updateMeri();
