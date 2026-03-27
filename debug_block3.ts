import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('session_id, seat_id, status')
        .eq('session_id', 'block3')
        .in('status', ['sold', 'blocked'])
        .limit(5000);

    if (error) throw error;

    console.log(`TOTAL tickets sold/blocked in Block 3: ${tickets.length}`);
    console.log(`Expected Admin Available Total: ${340 + 160 - tickets.length}`);
}
run();
