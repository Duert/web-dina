import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('tickets').select('status');
    const counts = {};
    if (data) {
        data.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
        console.log("DB Ticket Statuses:", counts);
    }
}
check();
