'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function resetApplicationData() {
    console.log("Starting data reset...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        return { success: false, error: "Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor." };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Delete all payments/orders
        const { error: ordersError } = await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (ordersError) {
            console.error("Error deleting orders:", ordersError);
            return { success: false, error: "Error borrando pedidos: " + ordersError.message };
        }

        // 2. Delete all registrations
        const { error: regError } = await supabaseAdmin.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (regError) {
            console.error("Error deleting registrations:", regError);
            return { success: false, error: "Error borrando inscripciones: " + regError.message };
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
            return { success: false, error: "Error reseteando tickets: " + ticketsError.message };
        }

        console.log("Data reset complete.");

        revalidatePath('/admin');
        revalidatePath('/accounting');
        return { success: true };

    } catch (e: any) {
        console.error("Unexpected error in resetApplicationData:", e);
        return { success: false, error: "Error inesperado: " + e.message };
    }
}

export async function deleteRegistration(registrationId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        return { success: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY" };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Release Tickets first
        const { error: ticketError } = await supabaseAdmin
            .from('tickets')
            .update({
                status: 'available',
                registration_id: null,
                holder_name: null,
                order_id: null,
                sold_at: null
            })
            .eq('registration_id', registrationId);

        if (ticketError) {
            console.error("Error releasing tickets:", ticketError);
            return { success: false, error: "Error liberando tickets: " + ticketError.message };
        }

        // 2. Delete Registration (Cascade should handle children like participants, but we do it safely)
        const { error: deleteError } = await supabaseAdmin
            .from('registrations')
            .delete()
            .eq('id', registrationId);

        if (deleteError) {
            console.error("Error deleting registration:", deleteError);
            return { success: false, error: "Error borrando inscripción: " + deleteError.message };
        }

        revalidatePath('/admin');
        revalidatePath('/accounting');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleSchoolApproval(userId: string, isApproved: boolean) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_approved: isApproved })
            .eq('id', userId);

        if (error) throw error;

        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getAllRegistrationsAction() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        return { success: false, error: "Server misconfiguration: Missing Service Key" };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registrations')
            .select(`
                *,
                profiles(school_name),
                registration_responsibles(count),
                registration_participants(num_tickets),
                tickets(count)
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        console.log(`getAllRegistrationsAction: Found ${data?.length} registrations`);
        return { success: true, data };
    } catch (error: any) {
        console.error("Error creating registrations:", error);
        return { success: false, error: error.message };
    }
}

export async function getRegistrationDetailsAction(id: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registrations')
            .select(`
                *,
                registration_responsibles(*),
                registration_participants(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getSchoolRegistrationsAction(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registrations')
            .select(`
                *,
                registration_responsibles(count),
                registration_participants(*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
