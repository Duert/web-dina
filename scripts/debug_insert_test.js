
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("Checking RLS and Schema...");

    // We can't run SQL directly but we can try to test an insert with the specific user to see the error.
    // We'll simulate a draft insert for that user.

    const testUserId = 'e50d4c1a-2bad-426e-925a-070a559d8e3f'; // The user we found

    const testPayload = {
        group_name: 'TEST_DEBUG_ENTRY',
        school_name: 'TEST_SCHOOL',
        category: 'Infantil',
        user_id: testUserId,
        status: 'draft',
        updated_at: new Date().toISOString()
    };

    console.log("Attempting dry-run insert...");

    // We'll use the service role, so RLS is bypassed. 
    // To test RLS, we'd need to auth as that user (which we can't easily without their password).
    // BUT we can check if the constraints fail.

    const { data, error } = await supabase
        .from('registrations')
        .insert([testPayload])
        .select();

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert SUCCEEDED (Deleting now...)");
        const { error: delErr } = await supabase.from('registrations').delete().eq('id', data[0].id);
        if (delErr) console.error("Cleanup failed:", delErr);
    }
}

checkSchema();
