import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: registrations } = await supabase.from('registrations').select(`id, status, is_confirmed, registration_participants(num_tickets)`);
    let dancersDraft = 0; let ticketsDraft = 0;
    for (const reg of registrations) {
        if (reg.status !== 'draft') continue;
        const pCount = reg.registration_participants?.length || 0;
        const tCount = reg.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;
        dancersDraft += pCount; ticketsDraft += tCount;
    }
    console.log("Draft Dancers:", dancersDraft, "Draft Tickets:", ticketsDraft);
}
main();
