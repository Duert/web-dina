
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSeatIds() {
    console.log('Checking ticket seat_ids...');

    // Fetch a sample of sold tickets
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('id, seat_id, session_id, status')
        .eq('status', 'sold')
        .range(0, 100);

    if (error) {
        console.error('Error fetching tickets:', error);
        return;
    }

    console.log(`Found ${tickets.length} sample tickets.`);

    const prefixes = new Set<string>();
    const samplesByPrefix: Record<string, string> = {};

    tickets.forEach(t => {
        const parts = t.seat_id.split('-');
        // guess prefix
        let prefix = "UNKNOWN";
        if (t.seat_id.startsWith('Patio')) prefix = 'Patio';
        else if (t.seat_id.startsWith('R')) prefix = 'R';
        else if (t.seat_id.startsWith('P')) prefix = 'P-Short'; // Maybe P-1-1?
        else prefix = parts[0];

        prefixes.add(prefix);
        if (!samplesByPrefix[prefix]) samplesByPrefix[prefix] = t.seat_id;
    });

    console.log('Unique prefixes found:', Array.from(prefixes));

    // Show samples for each prefix
    Array.from(prefixes).forEach(prefix => {
        console.log(`\nSample for ${prefix}: ${samplesByPrefix[prefix]}`);
        const id = samplesByPrefix[prefix];
        console.log(`  Split by '-':`, id.split('-'));
    });
}

checkSeatIds();
