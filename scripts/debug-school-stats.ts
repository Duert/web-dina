
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

async function debugSchoolStats() {
    console.log("Debugging School Stats Logic...");

    // 1. Fetch profiles (limit to 5 for brevity, or find one with tickets)
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*');
    // .limit(5);

    if (profError) { console.error(profError); return; }
    console.log(`Fetched ${profiles.length} profiles.`);

    // 2. Fetch registrations
    const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id, user_id');

    if (regError) { console.error(regError); return; }
    console.log(`Fetched ${registrations.length} registrations.`);

    // 3. Fetch sold tickets
    const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('registration_id, session_id')
        .eq('status', 'sold');

    if (ticketError) { console.error(ticketError); return; }
    console.log(`Fetched ${tickets.length} sold tickets.`);

    // 4. Simulate Aggregation
    let schoolsWithTickets = 0;

    profiles.forEach(profile => {
        const schoolRegs = registrations.filter(r => r.user_id === profile.id);
        const regIds = schoolRegs.map(r => r.id);

        const schoolTickets = tickets.filter(t => t.registration_id && regIds.includes(t.registration_id));

        if (schoolTickets.length > 0) {
            schoolsWithTickets++;
            console.log(`\nSchool: ${profile.school_name} (ID: ${profile.id})`);
            console.log(`- Registrations: ${schoolRegs.length}`);
            console.log(`- Total Tickets: ${schoolTickets.length}`);

            const b1 = schoolTickets.filter(t => t.session_id === 'block1').length;
            const b2 = schoolTickets.filter(t => t.session_id === 'block2').length;
            const b3 = schoolTickets.filter(t => t.session_id === 'block3').length;
            const b4 = schoolTickets.filter(t => t.session_id === 'block4').length;

            console.log(`- Block Breakdown: B1=${b1}, B2=${b2}, B3=${b3}, B4=${b4}`);
        }
    });

    console.log(`\nFound ${schoolsWithTickets} schools with tickets out of ${profiles.length} profiles.`);

    if (schoolsWithTickets === 0) {
        console.log("WARNING: Zero schools found with tickets. Check linkage.");
        // Check if any tickets have a registration_id that exists in registrations
        const regIds = registrations.map(r => r.id);
        const orphanTickets = tickets.filter(t => !t.registration_id || !regIds.includes(t.registration_id));
        console.log(`Orphan tickets (no valid registration): ${orphanTickets.length} / ${tickets.length}`);

        if (orphanTickets.length < tickets.length) {
            console.log("Some tickets have valid registrations. Check user_id on those registrations.");
            const validTickets = tickets.filter(t => t.registration_id && regIds.includes(t.registration_id));
            const firstValid = validTickets[0];
            const reg = registrations.find(r => r.id === firstValid.registration_id);
            console.log("Sample valid ticket reg:", reg);
            const user = profiles.find(p => p.id === reg?.user_id);
            console.log("Linked User:", user ? user.school_name : "NOT FOUND in profiles");
        }
    }
}

debugSchoolStats();
