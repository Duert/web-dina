
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTickets() {
    console.log("Checking tickets table...");

    // 1. Count total tickets
    const { count, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error counting tickets:", countError);
        return;
    }
    console.log(`Total tickets: ${count}`);

    // 2. Get distinct statuses
    const { data: statuses, error: statusError } = await supabase
        .from('tickets')
        .select('status');

    if (statusError) {
        console.error("Error fetching statuses:", statusError);
    } else {
        const uniqueStatuses = [...new Set(statuses.map(t => t.status))];
        console.log("Unique statuses:", uniqueStatuses);

        // Count per status
        for (const status of uniqueStatuses) {
            const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', status);
            console.log(`Status '${status}': ${count}`);
        }
    }

    // 3. Get distinct session_ids
    const { data: sessions, error: sessionError } = await supabase
        .from('tickets')
        .select('session_id');

    if (sessionError) {
        console.error("Error fetching sessions:", sessionError);
    } else {
        const uniqueSessions = [...new Set(sessions.map(t => t.session_id))];
        console.log("Unique session_ids:", uniqueSessions);

        // Count per session
        for (const session of uniqueSessions) {
            const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('session_id', session);
            console.log(`Session '${session}': ${count}`);
        }
    }

    // 4. Check for 'sold' tickets specifically
    const { data: soldTickets } = await supabase
        .from('tickets')
        .select('id, session_id, registration_id')
        .eq('status', 'sold')
        .limit(5);

    console.log("Sample 'sold' tickets:", soldTickets);
}

checkTickets();
