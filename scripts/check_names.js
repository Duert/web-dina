const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: dcols } = await supabase.from('dancers').select('*').limit(1);
    console.log("Dancers columns:", dcols?.[0] ? Object.keys(dcols[0]) : "Empty table");

    const { data: rcols } = await supabase.from('responsibles').select('*').limit(1);
    console.log("Responsibles columns:", rcols?.[0] ? Object.keys(rcols[0]) : "Empty table");

    const { data: d } = await supabase.from('dancers').select('id, first_name, last_name').ilike('first_name', '%Meri%');
    console.log("Dancers named Meri:", d);

    const { data: d2 } = await supabase.from('dancers').select('id, first_name, last_name').ilike('last_name', '%Iznajar%');
    console.log("Dancers last_name Iznajar:", d2);

    const { data: r } = await supabase.from('responsibles').select('id, first_name, last_name').ilike('first_name', '%Pau%');
    console.log("Responsibles named Pau:", r);
}
run();
