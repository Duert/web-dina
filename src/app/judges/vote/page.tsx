"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchGroupsForVoting, fetchJudgesCriteriaConfig, submitScore, fetchScoresForGroup } from "@/app/actions-judges";
import { ArrowLeft, Star, Check, User, Trophy, Save, AlertCircle, ChevronRight } from "lucide-react";

// Component wrapper for Suspense
function VotingInterface() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const block = searchParams.get('block');
    const category = searchParams.get('category');

    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [judgeInfo, setJudgeInfo] = useState<{ id: number, name: string } | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

    // Scoring State
    const [activeCriteria, setActiveCriteria] = useState<string[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [alreadyVoted, setAlreadyVoted] = useState(false);

    useEffect(() => {
        // Auth check
        const session = localStorage.getItem('dina_judge_session');
        if (!session) {
            router.push('/judges');
            return;
        }
        const parsedSession = JSON.parse(session);
        setJudgeInfo(parsedSession);

        if (block && category) {
            loadData(parsedSession.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [block, category]);

    // Correct order of criteria
    const ORDERED_CRITERIA = [
        'Musicalidad',
        'Técnica',
        'Actitud',
        'Innovación',
        'Sincronía',
        'Ejecución de la coreografía',
        'Utilización del espacio',
        'Imagen y vestuario',
        'Variedad de estilos',
        'Impresión Global'
    ];

    const loadData = async (judgeId: number) => {
        setLoading(true);
        try {
            // 1. Fetch Groups
            const groupsRes = await fetchGroupsForVoting(block!, category!);
            if (groupsRes.success) {
                setGroups(groupsRes.data || []);
            }

            // 2. Fetch Config for this judge
            const configRes = await fetchJudgesCriteriaConfig();
            if (configRes.success) {
                // Filter criteria active for THIS judge
                const criteria = configRes.data
                    .filter((c: any) => c.judge_id === judgeId && c.is_active)
                    .map((c: any) => c.criteria_name);

                // Sort criteria according to the defined order
                criteria.sort((a: string, b: string) => {
                    const indexA = ORDERED_CRITERIA.indexOf(a);
                    const indexB = ORDERED_CRITERIA.indexOf(b);
                    // If not found (shouldn't happen), put at end
                    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                });

                setActiveCriteria(criteria);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Load draft from local storage or DB
    const handleSelectGroup = async (group: any) => {
        setSelectedGroup(group);
        setScores({}); // Reset scores initially
        setAlreadyVoted(false);

        if (!judgeInfo) return;

        // 1. Try to fetch confirmed votes from DB
        const scoresRes = await fetchScoresForGroup(group.id);
        let loadedFromDb = false;

        if (scoresRes.success && judgeInfo) {
            const myScores = scoresRes.data.filter((s: any) => s.judge_id === judgeInfo.id);
            if (myScores.length > 0) {
                setAlreadyVoted(true);
                const existing: Record<string, number> = {};
                myScores.forEach((s: any) => {
                    existing[s.criteria_name] = s.score;
                });
                setScores(existing);
                loadedFromDb = true;
            }
        }

        // 2. If no DB votes, check for local draft
        if (!loadedFromDb) {
            const draftKey = `dina_draft_${judgeInfo.id}_${group.id}`;
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                try {
                    setScores(JSON.parse(draft));
                    // Optional: Show toast "Borrador recuperado"
                } catch (e) {
                    console.error("Error parsing draft", e);
                }
            }
        }
    };

    const handleScoreChange = (criteria: string, value: number) => {
        setScores(prev => {
            const currentVal = prev[criteria];
            const newScores = { ...prev };

            if (currentVal === value) {
                delete newScores[criteria];
            } else {
                newScores[criteria] = value;
            }

            // Save draft immediately
            if (judgeInfo && selectedGroup) {
                localStorage.setItem(`dina_draft_${judgeInfo.id}_${selectedGroup.id}`, JSON.stringify(newScores));
            }
            return newScores;
        });
    };

    const handleSubmit = async () => {
        if (!selectedGroup || !judgeInfo) return;

        const missing = activeCriteria.filter(c => scores[c] === undefined);
        if (missing.length > 0) {
            alert(`Faltan puntuar: ${missing.join(', ')}`);
            return;
        }

        setSubmitting(true);
        try {
            // Submit each score
            for (const criteria of activeCriteria) {
                await submitScore({
                    registration_id: selectedGroup.id,
                    judge_id: judgeInfo.id,
                    judge_name: judgeInfo.name,
                    criteria_name: criteria,
                    score: scores[criteria],
                    block: block!,
                    category: category!
                });
            }

            // Clear draft on success
            localStorage.removeItem(`dina_draft_${judgeInfo.id}_${selectedGroup.id}`);

            // alert("¡Puntuación guardada!"); // Removed alert to streamline flow

            // Auto-advance logic
            const currentIndex = groups.findIndex(g => g.id === selectedGroup.id);
            if (currentIndex !== -1 && currentIndex < groups.length - 1) {
                const nextGroup = groups[currentIndex + 1];
                // Small delay or instant? Instant is better but maybe a toast?
                // Using standard confirm/alert might block flow. 
                // Let's just move.
                handleSelectGroup(nextGroup);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                alert("¡Has terminado con este grupo! Volviendo al listado.");
                setSelectedGroup(null);
            }

        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNavigation = (direction: 'prev' | 'next') => {
        if (!selectedGroup) return;
        const currentIndex = groups.findIndex(g => g.id === selectedGroup.id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex >= 0 && newIndex < groups.length) {
            handleSelectGroup(groups[newIndex]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div></div>;
    }

    // --- VIEW: SCORING FORM ---
    if (selectedGroup) {
        const currentIndex = groups.findIndex(g => g.id === selectedGroup.id);
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === groups.length - 1;

        return (
            <div className="min-h-screen bg-black text-white pb-32">
                {/* Sticky Header */}
                <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
                    <div className="max-w-xl mx-auto flex justify-between items-center">
                        <button
                            onClick={() => setSelectedGroup(null)}
                            className="bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="text-center">
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Grupo {currentIndex + 1} de {groups.length}</span>
                            <h2 className="text-sm font-bold truncate max-w-[200px] leading-tight">{selectedGroup.group_name}</h2>
                        </div>
                        <div className="w-9"></div> {/* Spacer for alignment */}
                    </div>
                </div>

                <div className="p-4 max-w-xl mx-auto">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <User size={120} />
                        </div>
                        <span className="inline-block bg-pink-600/20 text-pink-400 text-xs font-black px-2 py-1 rounded mb-2">ORDEN {selectedGroup.order_index}</span>
                        <h1 className="text-3xl font-black mb-2 relative z-10 leading-none">{selectedGroup.group_name}</h1>
                        <p className="text-zinc-400 font-medium relative z-10 flex items-center gap-2">
                            <User size={16} /> {selectedGroup.school_name}
                        </p>
                        {alreadyVoted && (
                            <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <Check size={16} /> Puntuación guardada (Editando)
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {activeCriteria.length === 0 ? (
                            <div className="p-12 text-center bg-zinc-900 rounded-3xl border border-white/5">
                                <AlertCircle className="mx-auto mb-4 text-zinc-600" size={48} />
                                <p className="text-zinc-400">No tienes criterios asignados para puntuar.</p>
                            </div>
                        ) : (
                            activeCriteria.map((criteria) => (
                                <div key={criteria} className="bg-zinc-900 border border-white/5 rounded-3xl p-5 shadow-lg">
                                    <div className="flex justify-between items-end mb-4 px-1">
                                        <h3 className="font-bold text-xl text-zinc-200">{criteria}</h3>
                                        <div className={`text-3xl font-black tabular-nums transition-all ${scores[criteria] !== undefined ? 'text-pink-500 scale-110' : 'text-zinc-800'}`}>
                                            {scores[criteria] ?? 0}
                                        </div>
                                    </div>

                                    {/* Score Buttons Grid */}
                                    <div className="grid grid-cols-6 gap-2">
                                        {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => handleScoreChange(criteria, num)}
                                                className={`aspect-square rounded-2xl font-black text-lg transition-all flex items-center justify-center relative overflow-hidden ${scores[criteria] === num
                                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/40 ring-2 ring-pink-400 ring-offset-2 ring-offset-zinc-900 scale-[1.02] z-10'
                                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 active:bg-zinc-600'
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Fixed Bottom Controls */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent pt-12 z-50">
                    <div className="max-w-xl mx-auto flex gap-3">
                        <button
                            onClick={() => handleNavigation('prev')}
                            disabled={isFirst || submitting}
                            className="bg-zinc-800 text-white p-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                        >
                            <ChevronRight className="rotate-180" size={24} />
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 bg-white text-black hover:bg-zinc-200 font-black py-4 rounded-2xl shadow-xl shadow-white/10 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div> : <><Save size={20} /> GUARDAR</>}
                        </button>

                        <button
                            onClick={() => handleNavigation('next')}
                            disabled={isLast || submitting}
                            className="bg-zinc-800 text-white p-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: GROUPS LIST ---
    return (
        <div className="min-h-screen bg-black text-white p-4">
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft />
                    </button>
                    <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-0.5">Categoría</p>
                        <h1 className="text-xl font-black text-pink-500">{category}</h1>
                    </div>
                </div>

                <div className="space-y-3">
                    {groups.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600">
                            No hay grupos confirmados en esta categoría.
                        </div>
                    ) : (
                        groups.map((group, idx) => {
                            // Logic to check if voted needs to be passed or fetched. 
                            // Currently fetchGroupsForVoting doesn't return "voted by me" status.
                            // We can do it client side if we fetch scores, but better to just show visual feedback if we know it.
                            // For now, let's just improving the card style as requested.
                            // If we want to show "Votado", we need to fetch user scores first in the list view.

                            return (
                                <button
                                    key={group.id}
                                    onClick={() => handleSelectGroup(group)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-5 items-center">
                                            <div className="flex flex-col items-center justify-center w-12 min-w-12 h-12 bg-zinc-800/50 rounded-2xl">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Orden</span>
                                                <span className="text-2xl font-black text-white leading-none">{group.order_index ?? idx + 1}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl mb-1 group-hover:text-pink-400 transition-colors leading-tight">
                                                    {group.group_name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                                                    <User size={16} />
                                                    <span>{group.school_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-zinc-950 text-zinc-600 group-hover:bg-pink-600 group-hover:text-white transition-colors shadow-sm">
                                            <ChevronRight size={24} />
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VotePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
            <VotingInterface />
        </Suspense>
    );
}
