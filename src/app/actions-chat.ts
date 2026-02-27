'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function getRegistrationMessages(registrationId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registration_messages')
            .select('*')
            .eq('registration_id', registrationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function sendRegistrationMessage(registrationId: string, content: string, senderRole: 'admin' | 'user') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registration_messages')
            .insert([{
                registration_id: registrationId,
                content,
                sender_role: senderRole
            }]);

        if (error) throw error;

        // revalidatePath('/admin');  <-- Removed to prevent ANY potential refresh on the client side.
        // The admin panel should rely on its own realtime subscription or polling if needed, 
        // or we can revalidate ONLY if we are sure it won't affect the user. 
        // For now, safety first: no server-side revalidation triggers.
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function markMessagesAsRead(registrationId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registration_messages')
            .update({ is_read: true })
            .eq('registration_id', registrationId)
            .eq('sender_role', 'user')
            .eq('is_read', false);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getUnreadStats() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registration_messages')
            .select('registration_id')
            .eq('sender_role', 'user')
            .eq('is_read', false);

        if (error) throw error;

        // Group by registration_id
        const unreadCounts: Record<string, number> = {};
        data?.forEach((msg: any) => {
            unreadCounts[msg.registration_id] = (unreadCounts[msg.registration_id] || 0) + 1;
        });

        return { success: true, data: unreadCounts, total: data?.length || 0 };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// SCHOOL / USER ACTIONS

export async function getUserUnreadStats(registrationIds: string[]) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };
    if (!registrationIds || registrationIds.length === 0) return { success: true, data: {}, total: 0 };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data, error } = await supabaseAdmin
            .from('registration_messages')
            .select('registration_id')
            .eq('sender_role', 'admin') // Messages sent BY admin
            .eq('is_read', false)       // That are unread
            .in('registration_id', registrationIds);

        if (error) throw error;

        // Group by registration_id
        const unreadCounts: Record<string, number> = {};
        data?.forEach((msg: any) => {
            unreadCounts[msg.registration_id] = (unreadCounts[msg.registration_id] || 0) + 1;
        });

        return { success: true, data: unreadCounts, total: data?.length || 0 };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function markAdminMessagesAsRead(registrationId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) return { success: false, error: "Missing Service Key" };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { error } = await supabaseAdmin
            .from('registration_messages')
            .update({ is_read: true })
            .eq('registration_id', registrationId)
            .eq('sender_role', 'admin') // Mark ADMIN messages as read
            .eq('is_read', false);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// SCHOOL / USER ACTIONS



