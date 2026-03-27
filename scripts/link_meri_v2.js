const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Get Meri's Registration
    const { data: regi, error: errReg } = await supabase.from('registrations')
        .select('id')
        .eq('group_name', 'Meri Iznajar')
        .limit(1);
    
    if (errReg || !regi || !regi.length) { console.error("Meri reg not found"); return; }
    const regId = regi[0].id;

    // 2. Find participant 'Meri Iznajar' from an existing registration
    const { data: parts } = await supabase.from('registration_participants')
        .select('*')
        .ilike('name', '%Meri%')
        .limit(5);
    
    let meriDetails = parts.find(p => p.surnames && p.surnames.toLowerCase().includes('iznajar'));
    if (!meriDetails && parts.length > 0) meriDetails = parts[0]; // fallback
    
    if (meriDetails) {
        // Clone and insert
        const { id, registration_id, created_at, ...rest } = meriDetails;
        const insertData = { ...rest, registration_id: regId };
        
        const res1 = await supabase.from('registration_participants').insert([insertData]);
        console.log("Inserted Meri as participant:", res1.error ? res1.error : "OK");
    } else {
        console.log("Participant Meri Iznajar not found in other registrations. Inserting basic info.");
        const res1 = await supabase.from('registration_participants').insert([{
            registration_id: regId,
            name: "Meri",
            surnames: "Iznajar"
        }]);
        console.log("Inserted Meri basic:", res1.error ? res1.error : "OK");
    }

    // 3. Find responsible 'Pau Galan'
    const { data: resps } = await supabase.from('registration_responsibles')
        .select('*')
        .ilike('name', '%Pau%')
        .limit(5);

    let pauDetails = resps.find(r => r.surnames && r.surnames.toLowerCase().includes('galan'));
    if (!pauDetails && resps.length > 0) pauDetails = resps[0]; // fallback

    if (pauDetails) {
        const { id, registration_id, created_at, ...rest2 } = pauDetails;
        const insertData2 = { ...rest2, registration_id: regId };
        
        const res2 = await supabase.from('registration_responsibles').insert([insertData2]);
        console.log("Inserted Pau as responsible:", res2.error ? res2.error : "OK");
    } else {
        console.log("Responsible Pau Galan not found. Inserting basic.");
        const res2 = await supabase.from('registration_responsibles').insert([{
            registration_id: regId,
            name: "Pau",
            surnames: "Galan"
        }]);
        console.log("Inserted Pau basic:", res2.error ? res2.error : "OK");
    }
}
run();
