require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: lauraTickets, error: e1 } = await supabase.from('tickets').select('*').ilike('assigned_to', '%Laura%Gimenez%');
    console.log("Laura Tickets found:", lauraTickets?.length || 0);
    if (lauraTickets && lauraTickets.length > 0) {
        console.log("Sample Laura Ticket:", lauraTickets[0]);
    }

    const { data: udsUsers, error: e2 } = await supabase.from('profiles').select('*').ilike('school_name', '%UDS%');
    console.log("UDS Users found:", udsUsers?.length || 0);
    if (udsUsers && udsUsers.length > 0) {
        console.log("UDS User ID:", udsUsers[0].id, "| Name:", udsUsers[0].school_name);

        const { data: udsRegs } = await supabase.from('registrations').select('id, group_name').eq('user_id', udsUsers[0].id);
        console.log("UDS Registrations:", udsRegs?.length || 0);
        if (udsRegs && udsRegs.length > 0) {
            console.log("Sample UDS Reg:", udsRegs[0]);
        }
    }
}
main();
