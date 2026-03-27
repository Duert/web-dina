
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUDS() {
    console.log("Checking for 'UDS' related data...");

    // 1. Check Profiles matching "UDS"
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('school_name', '%UDS%');

    if (profError) console.error("Profile Error:", profError);
    console.log(`Found ${profiles?.length} profiles for 'UDS':`);
    profiles?.forEach(p => console.log(` - ID: ${p.id}, School: ${p.school_name}, Email: ${p.rep_email}`));

    if (!profiles || profiles.length === 0) {
        console.log("No profiles found matching UDS.");
    }

    // 2. Check Registrations for these profiles AND any registration with "UDS" in group name
    const { data: regs, error: regError } = await supabase
        .from('registrations')
        .select('*, profiles(school_name, rep_email)')
        .or(`group_name.ilike.%UDS%,school_name.ilike.%UDS%`); // Check explicit school_name too if present

    if (regError) console.error("Reg Error:", regError);
    console.log(`\nFound ${regs?.length} registrations matching 'UDS' in group_name or school_name:`);
    regs?.forEach(r => {
        console.log(` - RegID: ${r.id}`);
        console.log(`   Group: ${r.group_name}`);
        console.log(`   Category: ${r.category}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Owner ID: ${r.user_id}`);
        console.log(`   Profile Email: ${r.profiles?.rep_email || 'No Profile/Email'}`);
        console.log(`   Created: ${r.created_at}`);
        console.log('---');
    });

    // 3. Check for orphaned registrations (user_id not in any specific profile list if relevant)
    if (profiles && profiles.length > 0) {
        for (const p of profiles) {
            const { count, error } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', p.id);
            console.log(`Profile ${p.school_name} (${p.id}) has ${count} total registrations.`);
        }
    }
}

checkUDS();
