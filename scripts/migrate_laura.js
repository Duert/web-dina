require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("Starting migration of Laura Gimenez tickets to UDS...");

    // 1. Get UDS user
    const { data: udsUsers, error: e1 } = await supabase.from('profiles').select('*').ilike('school_name', '%UDS%').limit(1);
    if (e1 || !udsUsers || udsUsers.length === 0) {
        console.error("Could not find UDS user:", e1);
        return;
    }
    const udsId = udsUsers[0].id;
    console.log("Found UDS ID:", udsId);

    // 2. Create a special registration for these tickets
    const { data: newReg, error: e2 } = await supabase.from('registrations').insert({
        user_id: udsId,
        group_name: "Acompañantes UDS (Laura Gimenez)",
        category: "Acompañantes",
        status: "submitted", // Must be 'draft' or 'submitted'
        is_confirmed: true,
        notes: "Registro creado automáticamente para enlazar las 20 butacas de Bloque 4 asignadas manualmente a Laura Gimenez con la escuela UDS."
    }).select().single();

    if (e2 || !newReg) {
        console.error("Failed to create registration:", e2);
        return;
    }

    console.log("Created special registration:", newReg.id);

    // 3. Update the 20 tickets in block 4 to belong to this new registration
    const { data: updatedTickets, error: e3 } = await supabase.from('tickets')
        .update({ registration_id: newReg.id })
        .ilike('assigned_to', '%Laura%Gimenez%')
        .eq('session_id', 'block4')
        .select();

    if (e3) {
        console.error("Failed to update tickets:", e3);
        return;
    }

    console.log(`Successfully migrated ${updatedTickets.length} Block 4 tickets to UDS!`);
    if (updatedTickets.length > 0) {
        console.log(`Sample seat kept: ${updatedTickets[0].seat_id}`);
    }
}

main();
