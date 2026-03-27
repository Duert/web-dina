'use server';

import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function getCategoryQuotasAction() {
    const supabase = await createClient();
    try {
        const { data: quotas, error } = await supabase
            .from('category_quotas')
            .select('*')
            .order('category_name', { ascending: true });

        if (error) throw new Error(error.message);

        return { success: true, quotas };
    } catch (e: any) {
        console.error("Error fetching quotas:", e);
        return { success: false, message: e.message };
    }
}

export async function updateCategoryQuotaAction(categoryName: string, availableSpots: number, totalOpened: number) {
    const supabase = await createClient();
    try {
        const { error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error("No autenticado");

        const { error } = await supabase
            .from('category_quotas')
            .update({ available_spots: availableSpots, total_opened: totalOpened, updated_at: new Date().toISOString() })
            .eq('category_name', categoryName);

        if (error) throw new Error(error.message);

        revalidatePath('/admin');
        revalidatePath('/registration'); // Flush cache so users see new quotas
        return { success: true, message: 'Cupo actualizado' };
    } catch (error: any) {
        console.error("Error updating quota:", error);
        return { success: false, message: error.message };
    }
}

export async function consumeQuotaAction(categoryName: string) {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) return { success: false, message: 'Falta Service Key' };

    // Use admin client to skip RLS for consuming quotas
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseServiceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        const { data, error } = await supabaseAdmin.rpc('consume_category_quota', { p_category_name: categoryName });
        if (error) throw new Error(error.message);

        return { success: true, allowed: data as boolean };
    } catch (error: any) {
        console.error("Error consuming quota:", error);
        return { success: false, message: error.message };
    }
}
