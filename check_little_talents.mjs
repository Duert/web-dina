import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Search schools
    const { data: schools } = await supabase.from('schools').select('*').ilike('name', '%Little%');
    console.log("Schools matching 'Little':", JSON.stringify(schools, null, 2));

    const schoolIds = schools?.map(s => s.id) || [];

    // Search registrations
    let query = supabase.from('registrations').select('*');
    if (schoolIds.length > 0) {
        query = query.or(`group_name.ilike.%Little%,school_id.in.(${schoolIds.join(',')})`);
    } else {
        query = query.ilike('group_name', '%Little%');
    }

    const { data: regs, error: err1 } = await query;

    if (err1) {
        console.error("Error fetching registrations:", err1);
    } else {
        console.log("Registrations matching 'Little':", JSON.stringify(regs, null, 2));

        for (const r of regs) {
            const { data: parts } = await supabase
                .from('registration_participants')
                .select('*')
                .eq('registration_id', r.id);
            console.log(`Participants for ${r.group_name}:`, JSON.stringify(parts, null, 2));
        }
    }
}
check();
