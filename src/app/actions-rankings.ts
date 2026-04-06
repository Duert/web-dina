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


// --- ADMIN: GLOBAL VISIBILITY ---

export async function fetchGlobalRankingsVisibility() {
    try {
        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('public_rankings_visible')
            .eq('id', 1)
            .single();

        if (error) throw error;
        return { success: true, isVisible: data.public_rankings_visible };
    } catch (error: any) {
        // Default to false if column doesn't exist yet or error
        return { success: true, isVisible: false, error: error.message };
    }
}

export async function toggleGlobalRankingsVisibility(isVisible: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('app_settings')
            .update({ public_rankings_visible: isVisible })
            .eq('id', 1);

        if (error) throw error;
        revalidatePath('/'); // Update home
        revalidatePath('/admin/scores');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- ADMIN: PUBLICATION MANAGEMENT ---

export async function fetchRankingsStatus() {
    try {
        const { data, error } = await supabaseAdmin
            .from('rankings_status')
            .select('*');

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleRankingPublication(block: string, category: string, isPublished: boolean) {
    try {
        const { error } = await supabaseAdmin
            .from('rankings_status')
            .upsert({
                block,
                category,
                is_published: isPublished,
                updated_at: new Date().toISOString()
            }, { onConflict: 'block, category' });

        if (error) throw error;
        revalidatePath('/admin/scores');
        revalidatePath('/rankings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- PUBLIC: FETCH RANKINGS ---

export async function fetchPublicRankings(block: string, category: string) {
    try {
        // 1. Check if published
        const { data: status, error: statusError } = await supabaseAdmin
            .from('rankings_status')
            .select('is_published')
            .eq('block', block)
            .eq('category', category)
            .single();

        if (statusError && statusError.code !== 'PGRST116') throw statusError; // PGRST116 is 'not found'

        if (!status || !status.is_published) {
            return { success: false, error: "Clasificación no publicada", notPublished: true };
        }

        // 2. Fetch groups and scores if published
        // We need: Group Name, School, Total Score, Criteria Breakdown
        const { data: scores, error: scoresError } = await supabaseAdmin
            .from('scores')
            .select(`
                score,
                criteria_name,
                judge_name,
                judge_id,
                registration_id,
                registrations (
                    id,
                    group_name,
                    school_name,
                    category,
                    penalty,
                    is_confirmed
                )
            `)
            .eq('block', block)
            .eq('category', category);

        if (scoresError) throw scoresError;

        // 3. Process scores
        // Group by registration_id
        const groupsMap = new Map<string, {
            id: string,
            group_name: string,
            school_name: string,
            total: number,
            penalty: number,
            breakdown: Record<string, number>
        }>();

        const judgeNamesMap: Record<number, Set<string>> = {};

        scores?.forEach((s: any) => {
            if (!s.registrations || !s.registrations.is_confirmed) return;

            const regId = s.registrations.id;
            if (!groupsMap.has(regId)) {
                groupsMap.set(regId, {
                    id: regId,
                    group_name: (s.registrations.group_name || "").toUpperCase(),
                    school_name: s.registrations.school_name,
                    total: 0,
                    penalty: s.registrations.penalty || 0,
                    breakdown: {}
                });
            }

            const group = groupsMap.get(regId)!;
            group.total += s.score;
            group.breakdown[s.criteria_name] = (group.breakdown[s.criteria_name] || 0) + s.score;

            // Track Judge Names
            if (s.judge_name) {
                if (!judgeNamesMap[s.judge_id]) judgeNamesMap[s.judge_id] = new Set();
                judgeNamesMap[s.judge_id].add(s.judge_name);
            }
        });

        // Resolve names
        const resolvedNames: Record<number, string> = {};
        [1, 2, 3, 4].forEach(id => {
            const set = judgeNamesMap[id];
            if (set && set.size === 1) {
                resolvedNames[id] = Array.from(set)[0];
            } else if (set && set.size > 1) {
                resolvedNames[id] = "Varios";
            }
        });

        const groups = Array.from(groupsMap.values());
        groups.forEach(g => {
            g.total = g.total - g.penalty;
        });

        // Convert to array and sort
        const rankings = groups
            .sort((a, b) => {
                if (b.total !== a.total) return b.total - a.total; // Descending score
                
                // Tie-breaker based on Impresión Global
                const aImpresion = (a.breakdown && a.breakdown['Impresión Global']) ? a.breakdown['Impresión Global'] : 0;
                const bImpresion = (b.breakdown && b.breakdown['Impresión Global']) ? b.breakdown['Impresión Global'] : 0;
                
                return bImpresion - aImpresion;
            });

        // Assign Rank (handling ties?)
        const rankedResults = rankings.map((r, index) => ({
            rank: index + 1,
            ...r
        }));

        return { success: true, data: rankedResults, judges: resolvedNames };

    } catch (error: any) {
        console.error("Error fetching rankings:", error);
        return { success: false, error: error.message };
    }
}


// --- ANALYTICS: INTERACTIONS ---

export async function logInteraction(data: {
    sessionId: string;
    eventType: 'page_view' | 'category_selection' | 'group_expansion';
    pagePath: string;
    category?: string;
    groupName?: string;
    block?: string;
    metadata?: any;
}) {
    try {
        const { error } = await supabaseAdmin
            .from('page_interactions')
            .insert({
                session_id: data.sessionId,
                event_type: data.eventType,
                page_path: data.pagePath,
                category: data.category,
                group_name: data.groupName,
                block: data.block,
                metadata: data.metadata || {}
            });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error logging interaction:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchInteractionStats() {
    try {
        // 1. Total Visits (Page Views)
        const { count: totalViews, error: viewsError } = await supabaseAdmin
            .from('page_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'page_view');

        if (viewsError) throw viewsError;

        // 2. Unique Sessions
        const { data: uniqueSessions, error: sessionsError } = await supabaseAdmin
            .rpc('count_unique_sessions'); // If we have an RPC, otherwise we'll fetch and count unique strings (dangerous for large data)

        // Since I don't have the RPC, I'll use a simpler query for now
        const { data: sessionsData, error: sError } = await supabaseAdmin
            .from('page_interactions')
            .select('session_id');

        if (sError) throw sError;
        const uniqueSessionCount = new Set(sessionsData?.map(s => s.session_id)).size;

        // 3. Most viewed categories
        const { data: categoryStats, error: catError } = await supabaseAdmin
            .from('page_interactions')
            .select('category')
            .eq('event_type', 'category_selection')
            .not('category', 'is', null);

        if (catError) throw catError;
        
        const categoryCounts: Record<string, number> = {};
        categoryStats?.forEach(s => {
            categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
        });

        // 4. Most expanded groups
        const { data: groupStats, error: groupError } = await supabaseAdmin
            .from('page_interactions')
            .select('group_name')
            .eq('event_type', 'group_expansion')
            .not('group_name', 'is', null);

        if (groupError) throw groupError;

        const groupCounts: Record<string, number> = {};
        groupStats?.forEach(s => {
            groupCounts[(s.group_name || "").toUpperCase()] = (groupCounts[(s.group_name || "").toUpperCase()] || 0) + 1;
        });

        // Sort results
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        const sortedGroups = Object.entries(groupCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        return {
            success: true,
            stats: {
                totalViews,
                uniqueSessions: uniqueSessionCount,
                categories: sortedCategories,
                groups: sortedGroups
            }
        };

    } catch (error: any) {
        console.error("Error fetching stats:", error);
        return { success: false, error: error.message };
    }
}
