
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkLatestUser() {
    console.log("Checking latest users...");

    const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 5,
        sortBy: { field: 'created_at', direction: 'desc' }
    });

    if (error) {
        console.error("Error listing users:", error);
    } else {
        console.log(`Found ${users.length} recent users:`);
        users.forEach(u => {
            console.log(` - ${u.email} (ID: ${u.id})`);
            console.log(`   Created: ${u.created_at}`);
            console.log(`   Confirmed: ${u.email_confirmed_at}`);
            console.log(`   Last Sign In: ${u.last_sign_in_at}`);
            console.log('---');
        });
    }
}

checkLatestUser();
