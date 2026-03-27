
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkConstraints() {
    // We can't query information_schema directly via JS client easily without SQL function.
    // But we can test uniqueness.

    const testPayload1 = {
        group_name: 'TEST_UNIQUE_CHECK',
        school_name: 'TEST_SCHOOL',
        category: 'Infantil',
        user_id: 'e50d4c1a-2bad-426e-925a-070a559d8e3f',
        status: 'draft',
        updated_at: new Date().toISOString()
    };

    console.log("Inserting first...");
    const { data: d1, error: e1 } = await supabase.from('registrations').insert([testPayload1]).select();

    if (e1) { console.error("First insert failed:", e1); return; }

    console.log("Inserting DUPLICATE group_name...");
    const { data: d2, error: e2 } = await supabase.from('registrations').insert([testPayload1]).select();

    if (e2) {
        console.error("Duplicate insert failed (Likely Unique Constraint):", e2);
    } else {
        console.log("Duplicate insert SUCCEEDED (No unique constraint on group_name)");
        // Cleanup
        await supabase.from('registrations').delete().eq('id', d2[0].id);
    }

    // Cleanup first
    await supabase.from('registrations').delete().eq('id', d1[0].id);
}

checkConstraints();
