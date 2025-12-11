'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function resetApplicationData() {
    console.log("Starting data reset...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        throw new Error("Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor. No se puede realizar el borrado sin permisos de administrador.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 1. Delete all payments/orders
    const { error: ordersError } = await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (ordersError) {
        console.error("Error deleting orders:", ordersError);
        throw ordersError;
    }

    // 2. Delete all registrations
    const { error: regError } = await supabaseAdmin.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (regError) {
        console.error("Error deleting registrations:", regError);
        throw regError;
    }

    // 3. Reset Tickets status
    const { error: ticketsError } = await supabaseAdmin
        .from('tickets')
        .update({
            status: 'available',
            order_id: null,
            registration_id: null,
            sold_at: null,
            price: null,
            holder_name: null
        })
        .neq('status', 'available');

    if (ticketsError) {
        console.error("Error resetting tickets:", ticketsError);
        throw ticketsError;
    }

    console.log("Data reset complete.");

    revalidatePath('/admin');
    revalidatePath('/accounting');
}
