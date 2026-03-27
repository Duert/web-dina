const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Get correct user_id for Centro Adhara
    const { data: schools } = await supabase.from('registrations')
        .select('user_id')
        .ilike('school_name', '%Centro adhara%')
        .limit(1);

    if (!schools || schools.length === 0) { console.error("No Centro adhara found"); return; }
    const userId = schools[0].user_id;

    // 2. Update Meri's registration
    const { data: regi, error: errReg } = await supabase.from('registrations')
        .update({ user_id: userId })
        .eq('group_name', 'Meri Iznajar')
        .select('id');
    
    if (errReg || !regi.length) { console.error("Error updating Meri:", errReg); return; }
    const regId = regi[0].id;
    console.log("Meri user_id updated, Reg ID:", regId);

    // 3. Find Dancer Meri Iznajar
    const { data: dancers } = await supabase.from('dancers')
        .select('id, name')
        .ilike('name', '%Meri Iznajar%')
        .limit(1);
    
    if (dancers && dancers.length > 0) {
        const dancerId = dancers[0].id;
        const res1 = await supabase.from('registration_dancers')
            .upsert({ registration_id: regId, dancer_id: dancerId });
        console.log("Linked dancer:", dancers[0].name, res1.error ? "Error: " + res1.error.message : "Success");
    } else {
        console.log("Dancer not found");
    }

    // 4. Find Responsible Pau Galan
    const { data: resp } = await supabase.from('responsibles')
        .select('id, name')
        .ilike('name', '%Pau Galan%')
        .limit(1);

    if (resp && resp.length > 0) {
        const respId = resp[0].id;
        const res2 = await supabase.from('registration_responsibles')
            .upsert({ registration_id: regId, responsible_id: respId });
        console.log("Linked responsible:", resp[0].name, res2.error ? "Error: " + res2.error.message : "Success");
    } else {
        console.log("Responsible 'Pau Galan' not found");
    }
}
run();
