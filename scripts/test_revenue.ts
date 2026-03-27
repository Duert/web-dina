import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: registrations, error } = await supabase
        .from('registrations')
        .select(`
            id, 
            status, 
            is_confirmed, 
            registration_participants(num_tickets)
        `);

    if (error) {
        console.error(error);
        return;
    }

    let dancersConfirmed = 0;
    let ticketsConfirmed = 0;
    let dancersPending = 0;
    let ticketsPending = 0;

    for (const reg of registrations) {
        if (reg.status === 'draft') continue;

        const pCount = reg.registration_participants?.length || 0;
        const tCount = reg.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;

        if (reg.is_confirmed) {
            dancersConfirmed += pCount;
            ticketsConfirmed += tCount;
        } else {
            dancersPending += pCount;
            ticketsPending += tCount;
        }
    }

    console.log("Confirmed Dancers:", dancersConfirmed, "x 3.5 =", dancersConfirmed * 3.5);
    console.log("Confirmed Tickets:", ticketsConfirmed, "x 3 =", ticketsConfirmed * 3);
    console.log("Pending Dancers:", dancersPending, "x 3.5 =", dancersPending * 3.5);
    console.log("Pending Tickets:", ticketsPending, "x 3 =", ticketsPending * 3);
}

main();
