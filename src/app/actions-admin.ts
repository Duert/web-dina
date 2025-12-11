'use server'

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function resetApplicationData() {
    console.log("Starting data reset...");

    // 1. Delete all payments/orders
    // The dummy ID is just to allow the delete query to run on 'all' without an empty filter error if restrictive policies exist,
    // though usually .delete().neq(...) is a common trick to delete all rows if RLS allows.
    const { error: ordersError } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (ordersError) {
        console.error("Error deleting orders:", ordersError);
        throw ordersError;
    }

    // 2. Delete all registrations
    const { error: regError } = await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (regError) {
        console.error("Error deleting registrations:", regError);
        throw regError;
    }

    // 3. Reset Tickets status
    // We don't delete tickets, we reset them to 'available'
    const { error: ticketsError } = await supabase
        .from('tickets')
        .update({
            status: 'available',
            order_id: null,
            registration_id: null,
            sold_at: null,
            price: null,
            holder_name: null
        })
        .neq('status', 'available'); // Only update non-available ones for efficiency

    if (ticketsError) {
        console.error("Error resetting tickets:", ticketsError);
        throw ticketsError;
    }

    console.log("Data reset complete.");

    revalidatePath('/admin');
    revalidatePath('/accounting');
}
