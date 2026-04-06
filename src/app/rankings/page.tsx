'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sessions } from '@/lib/data';
import { fetchPublicRankings, logInteraction } from '@/app/actions-rankings';
import { Trophy, Medal, Ribbon, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function RankingsPage() {
    const [selectedBlock, setSelectedBlock] = useState(sessions[0]?.id || 'block1');
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const firstBlock = sessions[0];
        return firstBlock?.categoryRows?.flat()[0] || '';
    });
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notPublished, setNotPublished] = useState(false);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

    const [judgeNames, setJudgeNames] = useState<Record<string, string>>({});

    // --- Analytics ---
    const getSessionId = useCallback(() => {
        if (typeof window === 'undefined') return 'server';
        let sid = localStorage.getItem('dina_session_id');
        if (!sid) {
            sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('dina_session_id', sid);
        }
        return sid;
    }, []);

    // Log Page View
    useEffect(() => {
        logInteraction({
            sessionId: getSessionId(),
            eventType: 'page_view',
            pagePath: '/rankings',
            block: selectedBlock
        });
    }, [getSessionId, selectedBlock]);

    // Log Category Selection
    useEffect(() => {
        if (selectedCategory) {
            logInteraction({
                sessionId: getSessionId(),
                eventType: 'category_selection',
                pagePath: '/rankings',
                category: selectedCategory,
                block: selectedBlock
            });
        }
    }, [selectedCategory, selectedBlock, getSessionId]);

    // Get categories for selected block
    const activeCategories = useMemo(() => {
        return sessions.find(s => s.id === selectedBlock)?.categoryRows?.flat() || [];
    }, [selectedBlock]);

    const loadRankings = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotPublished(false);
        setResults([]);
        setJudgeNames({});

        try {
            const res = await fetchPublicRankings(selectedBlock, selectedCategory);

            if (res.success) {
                setResults(res.data || []);
                setJudgeNames(res.judges || {});
            } else if (res.notPublished) {
                setNotPublished(true);
            } else {
                setError(res.error || "Error cargando resultados");
            }
        } catch (err) {
            console.error(err);
            setError("Error de conexión al servidor");
        } finally {
            setLoading(false);
        }
    }, [selectedBlock, selectedCategory]);

    // Unified Control Effect: Selection -> Load
    useEffect(() => {
        // 1. Sync selection: if categories available and current not in, set first
        if (activeCategories.length > 0) {
            if (!selectedCategory || !activeCategories.includes(selectedCategory)) {
                setSelectedCategory(activeCategories[0]);
                // Return early to wait for the state update
                return;
            }
        }

        // 2. Load data: Only if valid combination
        if (selectedBlock && selectedCategory && activeCategories.includes(selectedCategory)) {
            loadRankings();
        }
    }, [selectedBlock, selectedCategory, activeCategories, loadRankings]);

    // Cleanup expanded state when results change
    useEffect(() => {
        setExpandedGroupId(null);
    }, [results]);

    const getMedalColor = (rank: number) => {
        switch (rank) {
            case 1: return 'text-yellow-400';
            case 2: return 'text-gray-300';
            case 3: return 'text-amber-600';
            default: return 'text-slate-400 font-bold';
        }
    };

    const getRowStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-yellow-500/10 border-yellow-500/20';
            case 2: return 'bg-gray-400/10 border-gray-400/20';
            case 3: return 'bg-amber-600/10 border-amber-600/20';
            default: return 'bg-slate-800/50 border-slate-700/50';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-white/10 p-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            DINA 2026
                        </Link>
                        <span className="text-slate-500">|</span>
                        <h1 className="font-bold text-slate-200">Clasificaciones</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">

                {/* Filters */}
                <section className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-xl">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Competición</label>
                        <div className="flex flex-wrap gap-2">
                            {sessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSelectedBlock(s.id);
                                        setResults([]); // Immediate feedback
                                        setLoading(true);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedBlock === s.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedBlock && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full md:w-auto min-w-[300px] p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {activeCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </section>

                {/* Results Area */}
                <section className="min-h-[300px]">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <Trophy className="text-yellow-500" />
                            Resultados: <span className="text-blue-400">{selectedCategory}</span>
                        </h2>

                        {/* Judge Panel Display */}
                        {results.length > 0 && Object.keys(judgeNames).length > 0 && (
                            <div className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5">
                                <span className="font-bold text-slate-300 uppercase mr-2">Jurado:</span>
                                {Object.entries(judgeNames).map(([id, name]) => name && (
                                    <span key={id} className="mr-3 last:mr-0 inline-block">
                                        <span className="text-slate-500">J{id}:</span> {name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                            <p>Cargando resultados...</p>
                        </div>
                    ) : notPublished ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-700">
                            <AlertCircle size={48} className="mb-4 text-slate-600" />
                            <h3 className="text-xl font-bold text-slate-400">Resultados no disponibles</h3>
                            <p className="text-slate-500 mt-2 max-w-md text-center">
                                Estén atentos a nuestras redes sociales, les avisaremos cuando estén publicadas.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-8 bg-red-900/20 border border-red-500/20 rounded-2xl text-red-400 text-center">
                            {error}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">No hay datos de puntuación disponibles.</div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {results.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        const isExpanding = expandedGroupId !== item.id;
                                        setExpandedGroupId(prev => prev === item.id ? null : item.id);
                                        if (isExpanding) {
                                            logInteraction({
                                                sessionId: getSessionId(),
                                                eventType: 'group_expansion',
                                                pagePath: '/rankings',
                                                category: selectedCategory,
                                                groupName: item.group_name,
                                                block: selectedBlock
                                            });
                                        }
                                    }}
                                    className={`relative p-5 rounded-2xl border flex flex-col transition-all cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] overflow-hidden group ${getRowStyle(item.rank)}`}
                                >
                                    <div className="flex items-center gap-4 md:gap-8">
                                        {/* Rank Badge */}
                                        <div className="shrink-0 flex flex-col items-center justify-center w-12 text-center md:w-16">
                                            <span className={`text-3xl md:text-4xl font-black heading-font ${getMedalColor(item.rank)}`}>
                                                {item.rank}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Posición</span>
                                        </div>

                                        {/* Group Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg md:text-xl font-bold truncate pr-4 text-white group-hover:text-blue-400 transition-colors">
                                                {item.group_name}
                                            </h3>
                                            <p className="text-slate-400 text-sm flex items-center gap-2">
                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-300">{item.school_name}</span>
                                            </p>

                                            {/* Preview criteria (hidden when expanded) */}
                                            {expandedGroupId !== item.id && (
                                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500 md:text-xs">
                                                    {Object.entries(item.breakdown)
                                                        .sort(([keyA], [keyB]) => {
                                                            const order = [
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
                                                            const idxA = order.indexOf(keyA);
                                                            const idxB = order.indexOf(keyB);
                                                            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                                                        })
                                                        .slice(0, 2).map(([key, val]) => (
                                                            <span key={key} className="bg-black/30 px-2 py-1 rounded border border-white/5">
                                                                {key}: <span className="text-slate-300 font-bold">{val as number}</span>
                                                            </span>
                                                        ))}
                                                    <span className="px-2 py-1 text-blue-400 font-bold flex items-center gap-1">
                                                        Ver detalle <ChevronDown size={12} />
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Total Score */}
                                        <div className="shrink-0 text-right pl-4 border-l border-white/5">
                                            <div className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tight">
                                                {item.total}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 text-right">Puntos</div>
                                            {item.penalty > 0 && (
                                                <div className="text-[10px] uppercase font-bold text-red-400 text-right mt-1">
                                                    -{item.penalty} Pen.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {expandedGroupId === item.id && (
                                        <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                                {Object.entries(item.breakdown)
                                                    .sort(([keyA], [keyB]) => {
                                                        const order = [
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
                                                        const idxA = order.indexOf(keyA);
                                                        const idxB = order.indexOf(keyB);
                                                        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                                                    })
                                                    .map(([key, val]) => (
                                                        <div key={key} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 md:last:border-b">
                                                            <span className="text-sm text-slate-400 font-medium">{key}</span>
                                                            <span className="text-lg font-black text-blue-400 tabular-nums">{val as number}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                            
                                            {item.penalty > 0 && (
                                                <div className="mt-4 p-3 bg-red-950/30 rounded-xl border border-red-500/20 flex justify-between items-center">
                                                    <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Penalizaciones / Descuentos</span>
                                                    <span className="text-xl font-black text-red-500">-{item.penalty}</span>
                                                </div>
                                            )}

                                            <div className="mt-6 flex justify-center text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] border-t border-white/5 pt-4">
                                                <button className="flex items-center gap-2 hover:text-white transition-colors">
                                                    Cerrar detalle <ChevronUp size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Decorative Trophy for 1st place */}
                                    {item.rank === 1 && (
                                        <div className="absolute -top-4 -right-4 opacity-10 rotate-12 pointer-events-none group-hover:opacity-20 transition-opacity">
                                            <Trophy size={120} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
