'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Block a seat - marks it as 'blocked' so it can't be auto-assigned
 */
export async function blockSeatAction(sessionId: string, seatId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('tickets')
            .upsert({
                session_id: sessionId,
                seat_id: seatId,
                status: 'blocked',
                price: 3.0,
                assigned_to: null,
                is_free: false,
                registration_id: null
            }, {
                onConflict: 'session_id,seat_id'
            });

        if (error) throw error;

        revalidatePath('/accounting');
        revalidatePath('/admin/assign');

        return { success: true };
    } catch (error: any) {
        console.error('Error blocking seat:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Unblock a seat - marks it as 'available' again
 */
export async function unblockSeatAction(sessionId: string, seatId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('tickets')
            .update({
                status: 'available',
                assigned_to: null,
                is_free: false,
                registration_id: null
            })
            .eq('session_id', sessionId)
            .eq('seat_id', seatId);

        if (error) throw error;

        revalidatePath('/accounting');
        revalidatePath('/admin/assign');

        return { success: true };
    } catch (error: any) {
        console.error('Error unblocking seat:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Manually assign a blocked seat with custom information
 */
export async function manualAssignSeatAction(
    sessionId: string,
    seatId: string,
    assignedTo: string,
    isFree: boolean,
    registrationId?: string | null
) {
    try {
        const price = isFree ? 0 : 3.0;

        const { error } = await supabaseAdmin
            .from('tickets')
            .upsert({
                session_id: sessionId,
                seat_id: seatId,
                status: 'sold',
                assigned_to: assignedTo,
                is_free: isFree,
                price: price,
                registration_id: registrationId || null, // Allow linking to a registration
                sold_at: new Date().toISOString()
            }, {
                onConflict: 'session_id,seat_id'
            });

        if (error) throw error;

        revalidatePath('/accounting');
        revalidatePath('/admin/assign');
        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error('Error manually assigning seat:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all blocked/manually assigned seats for a session
 */
export async function getBlockedSeatsAction(sessionId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('tickets')
            .select('*, seats(*)')
            .eq('session_id', sessionId)
            .or('status.eq.blocked,and(status.eq.sold,registration_id.is.null)');

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching blocked seats:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Unassign a seat that was assigned to a registration
 */
export async function unassignSeatAction(sessionId: string, seatId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('tickets')
            .delete()
            .eq('session_id', sessionId)
            .eq('seat_id', seatId);

        if (error) throw error;

        revalidatePath('/admin/assign');

        return { success: true };
    } catch (error: any) {
        console.error('Error unassigning seat:', error);
        return { success: false, error: error.message };
    }
}
