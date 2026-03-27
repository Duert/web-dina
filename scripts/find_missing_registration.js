
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findRegistration() {
    console.log("Searching for registration...");

    // Search by group name
    const { data: byGroup, error: errGroup } = await supabase
        .from('registrations')
        .select('*')
        .ilike('group_name', '%Nyumba%');

    if (errGroup) console.error("Error searching group:", errGroup);
    else {
        console.log(`Found ${byGroup.length} registrations by Group Name 'Nyumba':`);
        byGroup.forEach(reg => {
            console.log(` - ${reg.group_name} (Status: ${reg.status}) - ID: ${reg.id} - Created: ${reg.created_at}`);
        });
    }

    // Search by school name
    const { data: bySchool, error: errSchool } = await supabase
        .from('registrations')
        .select('*')
        .ilike('school_name', '%New Concept%');

    if (errSchool) console.error("Error searching school:", errSchool);
    else {
        console.log(`Found ${bySchool.length} registrations by School Name 'New Concept':`);
        bySchool.forEach(reg => {
            console.log(` - ${reg.group_name} (Status: ${reg.status}) - ID: ${reg.id} - Created: ${reg.created_at}`);
        });
    }
}

findRegistration();
