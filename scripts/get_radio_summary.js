const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan credenciales de Supabase en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSummary() {
    try {
        // 1. Grupos Inscritos
        const { data: submittedRegs, error: rErr } = await supabase
            .from('registrations')
            .select('id, group_name, category, is_confirmed')
            .in('status', ['submitted', 'submitted_modifiable']);

        if (rErr) throw rErr;

        // 2. Bailarines
        // Contar participantes en registros 'submitted' (para ignorar los drafts)
        const validRegIds = submittedRegs.map(r => r.id);
        let totalDancers = 0;
        if (validRegIds.length > 0) {
            const { data: participants, error: pErr } = await supabase
                .from('registration_participants')
                .select('id')
                .in('registration_id', validRegIds);
            if (pErr) throw pErr;
            totalDancers = participants.length;
        }

        // 3. Entradas Vendidas / Asignadas
        // Hay dos tablas o un `tickets` vinculado a `registrations`
        let totalTickets = 0;
        if (validRegIds.length > 0) {
            const { data: ticketsItems, error: tErr } = await supabase
                .from('tickets')
                .select('count')
                .in('registration_id', validRegIds);
            if (!tErr && ticketsItems) {
                totalTickets = ticketsItems.reduce((acc, t) => acc + (t.count || 0), 0);
            }
        }

        // Separar por categorías
        const porBloque = { B1: 0, B2: 0, B3: 0, B4: 0 };

        // Función helper para categorizar por bloque igual que en contabilidad
        const blocksMap = {
            'Infantil': 'B1', 'Infantil Mini-parejas': 'B1', 'Mini-Solistas Infantil': 'B1',
            'Junior': 'B2', 'Junior Mini-parejas': 'B2', 'Mini-Solistas Junior': 'B2',
            'Juvenil': 'B3', 'Juvenil Parejas': 'B3', 'Solistas Juvenil': 'B3',
            'Absoluta': 'B4', 'Parejas': 'B4', 'Solistas Absoluta': 'B4', 'Premium': 'B4'
        };

        submittedRegs.forEach(reg => {
            const block = blocksMap[reg.category] || 'Otros';
            if (porBloque[block] !== undefined) porBloque[block]++;
        });

        const report = {
            total_grupos: submittedRegs.length,
            grupos_confirmados: submittedRegs.filter(r => r.is_confirmed).length,
            total_bailarines: totalDancers,
            total_entradas_solicitadas: totalTickets,
            desglose_grupos_bloque: porBloque
        };

        console.log(JSON.stringify(report, null, 2));

    } catch (error) {
        console.error("Error obteniendo datos:", error);
    }
}

getSummary();
