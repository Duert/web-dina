'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
});

export async function fetchGroupsForPhotocall(block: string, category: string) {
    noStore();
    try {
        // Obtenemos los grupos confirmados de la categoría en orden de actuación
        const { data: registrations, error: regError } = await supabaseAdmin
            .from('registrations')
            .select('id, group_name, school_name, category, order_index, is_confirmed')
            .eq('category', category)
            .eq('is_confirmed', true)
            .order('order_index', { ascending: true });

        if (regError) throw regError;

        if (!registrations || registrations.length === 0) {
            return { success: true, data: [] };
        }

        // Recuperamos las fotos para estas inscripciones
        const registrationIds = registrations.map(r => r.id);
        const { data: photos, error: photoError } = await supabaseAdmin
            .from('photocall_photos')
            .select('registration_id, image_url')
            .in('registration_id', registrationIds);

        if (photoError) throw photoError;

        const photoMap = new Map(photos.map(p => [p.registration_id, p.image_url]));

        // Combinamos la información
        const combinedData = registrations.map(reg => ({
            ...reg,
            image_url: photoMap.get(reg.id) || null
        }));

        return { success: true, data: combinedData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function uploadPhotocallImageAction(registrationId: string, url: string) {
    try {
        const { error } = await supabaseAdmin
            .from('photocall_photos')
            .upsert(
                { registration_id: registrationId, image_url: url },
                { onConflict: 'registration_id' }
            );

        if (error) throw error;
        
        revalidatePath('/admin');
        revalidatePath('/photocall');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePhotocallImageAction(registrationId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('photocall_photos')
            .delete()
            .eq('registration_id', registrationId);

        if (error) throw error;
        
        revalidatePath('/admin');
        revalidatePath('/photocall');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchPhotocallPublished() {
    noStore();
    try {
        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('photocall_published')
            .eq('id', 1)
            .single();

        if (error) throw error;
        return { success: true, data: data?.photocall_published || false };
    } catch (error: any) {
        return { success: false, data: false };
    }
}

export async function togglePhotocallPublishedAction(isPublished: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ photocall_published: isPublished })
            .eq('id', 1);

        if (error) throw error;
        
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
