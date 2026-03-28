'use server'

import { createClient } from "@supabase/supabase-js"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, { ...options, cache: 'no-store' });
        }
    }
});

// --- JUDGES CONFIGURATION (Admin) ---

export async function fetchJudgesCriteriaConfig() {
    try {
        const { data, error } = await supabaseAdmin
            .from('judges_criteria')
            .select('*')
            .order('judge_id', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching judges config:', error);
        return { success: false, error: error.message };
    }
}

export async function toggleJudgeCriteria(judgeId: number, criteriaName: string, isActive: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('judges_criteria')
            .upsert({
                judge_id: judgeId,
                criteria_name: criteriaName,
                is_active: isActive
            }, { onConflict: 'judge_id, criteria_name' });

        if (error) throw error;
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- GROUPS & ORDERING ---

export async function fetchGroupsForVoting(block: string, category: string) {
    noStore();
    try {
        // We'll use the session_id mapping if needed, or just filter registrations by category?
        // Wait, registrations don't have 'block' directly, they are assigned to sessions via tickets or Logic.
        // Actually, the user says "Elegir Bloque -> Categoria".
        // In this system, categories are usually tied to blocks implicitly or explicitly.
        // For simplicity, we fetch all registrations of a category. 
        // If categories overlap blocks (unlikely in this domain), we might need more logic.
        // Assuming unique categories per block or just filtering by category is enough.

        const { data, error } = await supabaseAdmin
            .from('registrations')
            .select('id, group_name, school_name, category, order_index, is_confirmed')
            .eq('category', category)
            .eq('is_confirmed', true) // Only verified/confirmed groups
            .order('order_index', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateGroupOrder(registrationId: string, newOrderIndex: number) {
    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ order_index: newOrderIndex })
            .eq('id', registrationId);

        if (error) throw error;
        revalidatePath('/admin/scores');
        revalidatePath('/judges/vote');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- SCORING ---

export async function submitScore(payload: {
    registration_id: string,
    judge_id: number,
    judge_name: string,
    criteria_name: string,
    score: number,
    block: string,
    category: string
}) {
    try {
        // Enforce Category Closure
        const { data: statusData } = await supabaseAdmin
            .from('category_status')
            .select('is_closed')
            .eq('category', payload.category)
            .single();

        if (statusData && statusData.is_closed) {
            return { success: false, error: "La categoría está cerrada. No se pueden modificar puntuaciones." };
        }

        const { error } = await supabaseAdmin
            .from('scores')
            .upsert({
                registration_id: payload.registration_id,
                judge_id: payload.judge_id,
                judge_name: payload.judge_name,
                criteria_name: payload.criteria_name, // e.g., 'Musicalidad'
                score: payload.score,
                block: payload.block,
                category: payload.category
            }, {
                onConflict: 'registration_id, judge_id, criteria_name'
            });

        if (error) throw error;

        // No heavy revalidate needed for judge app to keep it fast, maybe just for admin
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        console.error("Submit score error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchScoresForGroup(registrationId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('scores')
            .select('*')
            .eq('registration_id', registrationId);

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchJudgeCompletedScores(judgeId: number, category: string) {
    noStore();
    try {
        const { data, error } = await supabaseAdmin
            .from('scores')
            .select('registration_id')
            .eq('judge_id', judgeId)
            .eq('category', category);

        if (error) throw error;
        // Devuelve un array único de IDs que este juez ya ha empezado a puntuar
        const uniqueIds = Array.from(new Set(data.map(s => s.registration_id)));
        return { success: true, data: uniqueIds };
    } catch (error: any) {
        return { success: false, data: [] };
    }
}

export async function fetchCategoryStatus(category: string) {
    noStore();
    try {
        const { data, error } = await supabaseAdmin
            .from('category_status')
            .select('is_closed')
            .eq('category', category)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignorar "nada encontrado"
        return { success: true, is_closed: data ? data.is_closed : false };
    } catch (error: any) {
        return { success: false, is_closed: false };
    }
}

export async function toggleCategoryStatusAction(category: string, isClosed: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('category_status')
            .upsert({ category, is_closed: isClosed }, { onConflict: 'category' });

        if (error) throw error;
        revalidatePath('/admin/scores');
        revalidatePath('/judges/vote');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAdminScore(registration_id: string, judge_id: number, criteria_name: string, new_score: number, block: string, category: string, judge_name: string) {
    try {
        const { error } = await supabaseAdmin
            .from('scores')
            .upsert({
                registration_id,
                judge_id,
                criteria_name,
                score: new_score,
                block,
                category,
                judge_name
            }, {
                onConflict: 'registration_id, judge_id, criteria_name'
            });

        if (error) throw error;
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- RESULTS (Admin) ---

export async function updateRegistrationPenalty(registrationId: string, penalty: number) {
    try {
        const { error } = await supabaseAdmin
            .from('registrations')
            .update({ penalty })
            .eq('id', registrationId);

        if (error) throw error;
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resetAllScoresAction() {
    try {
        const { error } = await supabaseAdmin
            .from('scores')
            .delete()
            .neq('registration_id', '00000000-0000-0000-0000-000000000000'); // Delete all trick

        if (error) throw error;
        revalidatePath('/admin/scores');
        revalidatePath('/rankings');
        return { success: true };
    } catch (error: any) {
        console.error("Reset scores error:", error);
        return { success: false, error: error.message };
    }
}

export async function resetScoresByCategoryAction(block: string, category: string) {
    try {
        const { error } = await supabaseAdmin
            .from('scores')
            .delete()
            .eq('block', block)
            .eq('category', category);

        if (error) throw error;
        revalidatePath('/admin/scores');
        revalidatePath('/rankings');
        return { success: true };
    } catch (error: any) {
        console.error("Reset category scores error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchAllScores() {
    try {
        const { data, error } = await supabaseAdmin
            .from('registrations')
            .select(`
                id,
                group_name,
                school_name,
                block,
                category,
                penalty,
                scores (
                    judge_id,
                    judge_name,
                    criteria_name,
                    score
                )
            `)
            .eq('is_confirmed', true)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- JUDGE GLOBAL SETTINGS (Names & Count) ---

export async function fetchJudgesGlobalConfig() {
    noStore();
    try {
        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('judge_names, judges_count, is_order_published')
            .eq('id', 1)
            .single();

        if (error) throw error;

        return {
            success: true,
            data: {
                names: data.judge_names || { "1": "Juez 1", "2": "Juez 2", "3": "Juez 3", "4": "Juez 4" },
                count: data.judges_count || 4,
                is_order_published: data.is_order_published || false
            }
        };
    } catch (error: any) {
        console.error('Error fetching judge config:', error);
        // Fallback
        return {
            success: true,
            data: {
                names: { "1": "Juez 1", "2": "Juez 2", "3": "Juez 3", "4": "Juez 4" },
                count: 4,
                is_order_published: false
            }
        };
    }
}

export async function toggleOrderPublishedAction(isPublished: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ is_order_published: isPublished })
            .eq('id', 1);

        if (error) throw error;
        
        revalidatePath('/admin/scores');
        revalidatePath('/dashboard');
        revalidatePath('/escaletas');
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchAllEscaletas() {
    noStore();
    try {
        const { data, error } = await supabaseAdmin
            .from('escaletas')
            .select('category, image_url');
            
        if (error) throw error;
        
        const imagesMap: Record<string, string> = {};
        data?.forEach(row => {
            imagesMap[row.category] = row.image_url;
        });
        
        return { success: true, data: imagesMap };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateEscaletaImageAction(category: string, url: string | null) {
    try {
        if (url) {
            const { error } = await supabaseAdmin
                .from('escaletas')
                .upsert({ category, image_url: url }, { onConflict: 'category' });
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from('escaletas')
                .delete()
                .eq('category', category);
            if (error) throw error;
        }
        
        revalidatePath('/admin/scores');
        revalidatePath('/escaletas');
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Keep this for backward compatibility if needed, but standardizing on GlobalConfig is better
export async function fetchJudgeNames() {
    const res = await fetchJudgesGlobalConfig();
    return {
        success: res.success,
        data: res.data?.names
    };
}

export async function updateJudgeNames(names: Record<string, string>) {
    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ judge_names: names })
            .eq('id', 1);

        if (error) throw error;
        revalidatePath('/judges');
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateJudgesCount(count: number) {
    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ judges_count: count })
            .eq('id', 1);

        if (error) throw error;
        revalidatePath('/judges');
        revalidatePath('/admin/scores');
        revalidatePath('/judges/vote');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- JUDGE POOL MANAGEMENT ---

export async function fetchJudgePool() {
    try {
        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('judge_name_pool')
            .eq('id', 1)
            .single();

        if (error) throw error;
        return { success: true, data: data.judge_name_pool || [] };
    } catch (error: any) {
        console.error('Error fetching judge pool:', error);
        return { success: false, error: error.message };
    }
}

export async function addJudgeToPool(name: string) {
    try {
        // Fetch current pool first
        const { data, error: fetchError } = await supabaseAdmin
            .from('app_settings')
            .select('judge_name_pool')
            .eq('id', 1)
            .single();

        if (fetchError) throw fetchError;

        const currentPool = data.judge_name_pool || [];
        if (currentPool.includes(name)) {
            return { success: false, error: "El nombre ya existe en la lista." };
        }

        const newPool = [...currentPool, name].sort();

        const { error: updateError } = await supabaseAdmin
            .from('app_settings')
            .update({ judge_name_pool: newPool })
            .eq('id', 1);

        if (updateError) throw updateError;

        revalidatePath('/admin/scores');
        revalidatePath('/judges');
        return { success: true, data: newPool };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removeJudgeFromPool(name: string) {
    try {
        const { data, error: fetchError } = await supabaseAdmin
            .from('app_settings')
            .select('judge_name_pool')
            .eq('id', 1)
            .single();

        if (fetchError) throw fetchError;

        const currentPool = data.judge_name_pool || [];
        const newPool = currentPool.filter((n: string) => n !== name);

        const { error: updateError } = await supabaseAdmin
            .from('app_settings')
            .update({ judge_name_pool: newPool })
            .eq('id', 1);

        if (updateError) throw updateError;

        revalidatePath('/admin/scores');
        revalidatePath('/judges');
        return { success: true, data: newPool };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
