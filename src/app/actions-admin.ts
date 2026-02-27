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
                registration_participants(*),
                tickets(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getSchoolTicketsAction(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // Find all registrations for this school
        const { data: registrations, error: regError } = await supabaseAdmin
            .from('registrations')
            .select('id, group_name')
            .eq('user_id', userId);

        if (regError) throw regError;

        if (!registrations || registrations.length === 0) return { success: true, data: [] };

        const registrationIds = registrations.map(r => r.id);

        // Fetch all tickets for these registrations
        const { data: tickets, error: ticketError } = await supabaseAdmin
            .from('tickets')
            .select('*')
            .in('registration_id', registrationIds);

        if (ticketError) throw ticketError;

        // Map registration names to tickets for convenience
        const ticketsWithGroupName = tickets.map(t => ({
            ...t,
            group_name: registrations.find(r => r.id === t.registration_id)?.group_name
        }));

        return { success: true, data: ticketsWithGroupName };
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

export async function toggleRegistrationConfirmation(id: string, isConfirmed: boolean) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ is_confirmed: isConfirmed })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function togglePaymentVerification(id: string, isVerified: boolean) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ payment_verified: isVerified })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRegistrationCategory(id: string, newCategory: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Get current registration to check if we need to store original_category
        const { data: reg, error: fetchErr } = await supabaseAdmin
            .from('registrations')
            .select('category, original_category')
            .eq('id', id)
            .single();

        if (fetchErr) throw fetchErr;

        const originalCategory = reg.original_category || reg.category;

        const { error } = await supabaseAdmin
            .from('registrations')
            .update({
                category: newCategory,
                original_category: originalCategory
            })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMusicStatus(id: string, status: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ music_status: status })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleGroupRegistrationAction(enabled: boolean) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ group_registration_enabled: enabled })
            .eq('id', 1);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        revalidatePath('/registration');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateParticipantTickets(participantId: string, count: number) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registration_participants')
            .update({ num_tickets: count })
            .eq('id', participantId);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMusicUrl(registrationId: string, url: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ music_file_url: url })
            .eq('id', registrationId);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRegistrationNotes(registrationId: string, notes: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ notes: notes })
            .eq('id', registrationId);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRegistrationStatus(id: string, status: 'draft' | 'submitted' | 'submitted_modifiable') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ status: status })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
export async function getSchoolsStatsAction() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Fetch all profiles
        const { data: profiles, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('school_name', { ascending: true });

        if (profError) throw profError;

        // 2. Fetch all registrations
        const { data: registrations, error: regError } = await supabaseAdmin
            .from('registrations')
            .select('id, user_id');

        if (regError) throw regError;

        // 3. Fetch all participants
        const { data: participants, error: partError } = await supabaseAdmin
            .from('registration_participants')
            .select('registration_id');

        if (partError) throw partError;

        // 4. Fetch all tickets using pagination
        let allTickets: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: ticketsPage, error: ticketError } = await supabaseAdmin
                .from('tickets')
                .select('registration_id, session_id')
                .eq('status', 'sold')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (ticketError) throw ticketError;

            if (ticketsPage && ticketsPage.length > 0) {
                allTickets = [...allTickets, ...ticketsPage];
                if (ticketsPage.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }

        const tickets = allTickets;

        // Process data
        const stats = profiles.map(profile => {
            const schoolRegs = registrations.filter(r => r.user_id === profile.id);
            const regIds = schoolRegs.map(r => r.id);

            const schoolParts = participants.filter(p => regIds.includes(p.registration_id)).length;
            const schoolTickets = tickets.filter(t => t.registration_id && regIds.includes(t.registration_id));

            const ticketsByBlock = {
                block1: schoolTickets.filter(t => t.session_id === 'block1').length,
                block2: schoolTickets.filter(t => t.session_id === 'block2').length,
                block3: schoolTickets.filter(t => t.session_id === 'block3').length,
                block4: schoolTickets.filter(t => t.session_id === 'block4').length,
            };

            return {
                ...profile,
                groups_count: schoolRegs.length,
                participants_count: schoolParts,
                tickets_by_block: ticketsByBlock,
                total_tickets: schoolTickets.length
            };
        });

        return { success: true, data: stats };

    } catch (e: any) {
        console.error("Error in getSchoolsStatsAction:", e);
        return { success: false, error: e.message };
    }
}
