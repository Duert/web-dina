
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findUser() {
    console.log("Searching for users...");

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const matches = users.filter(u =>
        (u.email && u.email.toLowerCase().includes('new')) ||
        (u.email && u.email.toLowerCase().includes('concept'))
    );

    console.log(`Found ${matches.length} users matching 'new' or 'concept':`);
    matches.forEach(u => {
        console.log(` - ${u.email} (ID: ${u.id})`);
    });

    if (matches.length > 0) {
        console.log("\nChecking registrations for these users...");
        for (const user of matches) {
            const { data: regs, error: regErr } = await supabase
                .from('registrations')
                .select('*')
                .eq('user_id', user.id);

            if (regErr) console.error(`Error fetching regs for ${user.email}:`, regErr);
            else {
                console.log(`User ${user.email} has ${regs.length} registrations:`);
                regs.forEach(r => console.log(`   - ${r.group_name} (Status: ${r.status})`));
            }
        }
    }
}

findUser();
