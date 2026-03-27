'use server'

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Get all data needed for PDF export
 */
export async function getSeatMapDataAction(sessionId: string) {
    try {
        const [ticketsResult, registrationsResult] = await Promise.all([
            supabaseAdmin.from('tickets').select('*').eq('session_id', sessionId),
            supabaseAdmin.from('registrations').select('*')
        ]);

        if (ticketsResult.error) throw ticketsResult.error;
        if (registrationsResult.error) throw registrationsResult.error;

        return {
            success: true,
            data: {
                tickets: ticketsResult.data,
                registrations: registrationsResult.data
            }
        };
    } catch (error: any) {
        console.error('Error fetching seat map data:', error);
        return { success: false, error: error.message, data: null };
    }
}
