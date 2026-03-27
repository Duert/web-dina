const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    const { data: registrations, error: regError } = await supabaseAdmin
        .from('registrations')
        .select(`
      id,
      category,
      status,
      registration_participants(id),
      registration_responsibles(id)
    `);

    if (regError) {
        console.error("Error:", regError);
        return;
    }

    let totals = {
        verified: { p: 0, r: 0 },
        draft: { p: 0, r: 0 }
    };

    for (const reg of registrations) {
        const pCount = reg.registration_participants ? reg.registration_participants.length : 0;
        const rCount = reg.registration_responsibles ? reg.registration_responsibles.length : 0;
        const type = (reg.status === 'submitted' || reg.status === 'submitted_modifiable') ? 'verified' : 'draft';

        totals[type].p += pCount;
        totals[type].r += rCount;
    }

    console.log(`Verificados - Participantes: ${totals.verified.p}`);
    console.log(`Verificados - Responsables: ${totals.verified.r}`);
    console.log(`Borrador - Participantes: ${totals.draft.p}`);
    console.log(`Borrador - Responsables: ${totals.draft.r}`);
}

run();
