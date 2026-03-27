import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('session_id, status')
        .neq('status', 'available');
        
    const counts = {};
    if (tickets) {
        tickets.forEach(t => {
            counts[t.session_id] = (counts[t.session_id] || 0) + 1;
        });
    }
    console.log("Occupied tickets per session in DB:", counts);
}
check();
