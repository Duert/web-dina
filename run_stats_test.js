import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// mock sessions and initialSeats
const initialSeats = [
    // just dummy sizes to see if the shape matches
];

async function check() {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('session_id, seat_id, status')
        .in('status', ['sold', 'blocked']);
    
    // Aggregate by session
    const stats = { block1: 0, block2: 0, block3: 0, block4: 0 };
    tickets.forEach(t => {
        if (stats[t.session_id] !== undefined) {
            stats[t.session_id]++;
        }
    });
    console.log("DB EXACT OCCUPIED TICKETS:", stats);
}

check();
