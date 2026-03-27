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

const BLOCK_DEFINITIONS = {
    'Bloque 1': ['Infantil', 'Infantil Mini-parejas', 'Mini-Solistas Infantil'],
    'Bloque 2': ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior'],
    'Bloque 3': ['Juvenil', 'Juvenil Parejas', 'Solistas Juvenil'],
    'Bloque 4': ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium']
};

function getBlockForCategory(category) {
    for (const [block, categories] of Object.entries(BLOCK_DEFINITIONS)) {
        if (categories.includes(category)) {
            return block;
        }
    }
    return 'Desconocido';
}

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
        console.error("Error fetching data:", regError);
        return;
    }

    const totals = {
        'Bloque 1': { confirmed: { p: 0, r: 0 }, draft: { p: 0, r: 0 } },
        'Bloque 2': { confirmed: { p: 0, r: 0 }, draft: { p: 0, r: 0 } },
        'Bloque 3': { confirmed: { p: 0, r: 0 }, draft: { p: 0, r: 0 } },
        'Bloque 4': { confirmed: { p: 0, r: 0 }, draft: { p: 0, r: 0 } },
        'Desconocido': { confirmed: { p: 0, r: 0 }, draft: { p: 0, r: 0 } }
    };

    for (const reg of registrations) {
        const block = getBlockForCategory(reg.category);
        const pCount = reg.registration_participants ? reg.registration_participants.length : 0;
        const rCount = reg.registration_responsibles ? reg.registration_responsibles.length : 0;
        const type = (reg.status === 'submitted' || reg.status === 'submitted_modifiable') ? 'confirmed' : 'draft';

        if (totals[block]) {
            totals[block][type].p += pCount;
            totals[block][type].r += rCount;
        }
    }

    for (const [block, data] of Object.entries(totals)) {
        if (block === 'Desconocido' && data.confirmed.p === 0 && data.draft.p === 0) continue;
        console.log(`\n### ${block}`);
        console.log(`- **Verificados (Confirmados):** ${data.confirmed.p} participantes + ${data.confirmed.r} responsables = **${data.confirmed.p + data.confirmed.r} pulseras**`);
        console.log(`- **En Borrador:** ${data.draft.p} participantes + ${data.draft.r} responsables = **${data.draft.p + data.draft.r} pulseras**`);
        console.log(`- **Total ${block}:** ${data.confirmed.p + data.draft.p + data.confirmed.r + data.draft.r} pulseras`);
    }
}

run();
