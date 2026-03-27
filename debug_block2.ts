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
        .eq('session_id', 'block2')
        .in('status', ['sold', 'blocked'])
        .limit(5000);

    if (error) throw error;

    console.log(`TOTAL tickets sold/blocked in Block 2: ${tickets.length}`);

    // Let's emulate the public reduction logic:
    const patioTotal = 340;
    const anfiteatroTotal = 160;

    let patioAvailable = patioTotal;
    let anfTotalAvailable = anfiteatroTotal;

    const initialSeatsIds = new Set();
    // Recreate the minimal logical subset of initialSeats to test seat matching
    for (let i = 1; i <= 17; i++) {
        const seats = i <= 6 ? 24 : (i <= 10 ? 22 : 20);
        for (let j = 1; j <= seats; j++) initialSeatsIds.add(`R${i}-${j}`);
    }
    for (let i = 18; i <= 25; i++) {
        const seats = i <= 21 ? 24 : 16;
        for (let j = 1; j <= seats; j++) initialSeatsIds.add(`R${i}-${j}`);
    }

    let unmapped = 0;
    tickets.forEach(ticket => {
        if (initialSeatsIds.has(ticket.seat_id)) {
            const match = ticket.seat_id.match(/R(\d+)-/);
            const row = match ? parseInt(match[1]) : 0;
            if (row >= 18) anfTotalAvailable--;
            else patioAvailable--;
        } else {
            unmapped++;
            let fallbackZone = 'Patio de Butacas';
            if (ticket.seat_id) {
                const match = ticket.seat_id.match(/R(\d+)-/);
                if (match && parseInt(match[1]) >= 18) fallbackZone = 'Anfiteatro';
            }
            if (fallbackZone === 'Anfiteatro') anfTotalAvailable--;
            else patioAvailable--;
        }
    });

    console.log(`Expected Public Output: Patio=${patioAvailable}, Anfiteatro=${anfTotalAvailable}`);
    console.log(`Unmapped but subtracted using fallback: ${unmapped}`);
    console.log(`Expected Admin Available Total: ${patioTotal + anfiteatroTotal - tickets.length}`);
    console.log(`${patioAvailable + anfTotalAvailable === patioTotal + anfiteatroTotal - tickets.length ? 'THE SUMS MATCH' : 'THE SUMS ARE BROKEN'}`);
}
run();
