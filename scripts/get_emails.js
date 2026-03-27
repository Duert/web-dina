const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ftfdblgisxzsffqbxrkx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZmRibGdpc3h6c2ZmcWJ4cmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMxMTUwNiwiZXhwIjoyMDgwODg3NTA2fQ.-s6jN9kbRyizEv8MIyWtEIyueJvw18HRysv86vnHPtQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Obtener correos de registration_responsibles
    const { data: resps, error: errResp } = await supabase
        .from('registration_responsibles')
        .select('email, name, surnames');
    
    // 2. Obtener correos de perfiles de la escuela (users table u auth.users, depending on setup)
    const { data: profiles, error: errProf } = await supabase
        .from('profiles')
        .select('email, school_name');

    if (errResp) console.error("Error resps:", errResp);
    
    const emails = new Set();
    
    if (resps) {
        resps.forEach(r => {
            if (r.email && r.email.trim() !== '') {
                emails.add(r.email.trim().toLowerCase());
            }
        });
    }

    if (profiles) {
        profiles.forEach(p => {
             if (p.email && p.email.trim() !== '') {
                emails.add(p.email.trim().toLowerCase());
             }
        });
    }

    const uniqueEmails = Array.from(emails).sort();
    
    console.log(`\n\n--- EMAILS ÚNICOS DE RESPONSABLES (${uniqueEmails.length}) ---\n`);
    console.log(uniqueEmails.join(', '));
    console.log(`\n-------------------------------------------------\n\n`);
}
run();
