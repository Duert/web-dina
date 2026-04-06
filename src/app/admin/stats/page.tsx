'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchInteractionStats } from '@/app/actions-rankings';
import { 
    Users, 
    Eye, 
    MousePointer2, 
    Trophy, 
    BarChart3, 
    RefreshCw,
    TrendingUp,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminStatsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchInteractionStats();
            if (res.success) {
                setStats(res.stats);
            } else {
                setError(res.error || "Error cargando estadísticas");
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <RefreshCw size={48} className="animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Calculando estadísticas en tiempo real...</p>
            </div>
        );
    }

    const maxCategory = stats?.categories?.[0]?.[1] || 1;
    const maxGroup = stats?.groups?.[0]?.[1] || 1;
    const totalInteractions = (stats?.categories?.reduce((acc: any, curr: any) => acc + curr[1], 0) || 0) + 
                             (stats?.groups?.reduce((acc: any, curr: any) => acc + curr[1], 0) || 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
            {/* Nav */}
            <header className="max-w-6xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                            <Link href="/admin" className="hover:text-white transition-colors flex items-center gap-1">
                                <ArrowLeft size={14} /> Panel Admin
                            </Link>
                            <ChevronRight size={14} className="opacity-30" />
                            <span className="text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded-full text-[10px] uppercase">Analytics</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                            Métricas de <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Interacción</span>
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Seguimiento en tiempo real de la página de clasificaciones.</p>
                    </div>
                    
                    <button 
                        onClick={loadStats}
                        disabled={loading}
                        className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl text-sm font-bold transition-all border border-white/10 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        {loading ? 'Sincronizando...' : 'Actualizar Datos'}
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-2">
                        <Users size={16} /> {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-slate-900/60 transition-all">
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                            <Users size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4">
                                <Users size={20} />
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1 tabular-nums">{stats?.uniqueSessions || 0}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sesiones Únicas</p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-tight">Visitantes distintos detectados por sesión de navegador.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-slate-900/60 transition-all">
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                            <Eye size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-400 mb-4">
                                <Eye size={20} />
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1 tabular-nums">{stats?.totalViews || 0}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Vistas Rankings</p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-tight">Número total de veces que se ha abierto la página de clasificaciones.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-slate-900/60 transition-all">
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                            <MousePointer2 size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-4">
                                <MousePointer2 size={20} />
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1 tabular-nums">{totalInteractions}</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Clics Totales</p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-tight">Interacciones activas con categorías y detalles de grupos.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-slate-900/60 transition-all">
                        <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12">
                            <TrendingUp size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-4">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1 tabular-nums">
                                {stats?.totalViews ? ((stats.uniqueSessions / stats.totalViews) * 100).toFixed(1) : 0}%
                            </h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ratio Retención</p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-tight">Porcentaje de sesiones únicas frente a vistas totales.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                    
                    {/* Categories Stats */}
                    <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/20 p-2.5 rounded-2xl text-blue-400">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">Categorías Populares</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ranking por selección</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-7">
                            {stats?.categories?.length === 0 && (
                                <div className="text-center py-20 bg-black/10 rounded-3xl border border-dashed border-white/5">
                                    <p className="text-slate-500 text-sm font-medium">Aún no hay interacciones registradas.</p>
                                </div>
                            )}
                            {stats?.categories?.map(([name, count]: any, idx: number) => (
                                <div key={name} className="group/item">
                                    <div className="flex justify-between items-end mb-2.5">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-black text-slate-600 tabular-nums">0{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-200 truncate group-hover/item:text-blue-400 transition-colors uppercase tracking-tight">{name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-white tabular-nums">{count}</span>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase">visitas</span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner p-[1px]">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                            style={{ width: `${(count / maxCategory) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Groups Stats */}
                    <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-500/20 p-2.5 rounded-2xl text-yellow-500">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">Grupos con más Interés</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ranking por expansión de detalle</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-7">
                            {stats?.groups?.length === 0 && (
                                <div className="text-center py-20 bg-black/10 rounded-3xl border border-dashed border-white/5">
                                    <p className="text-slate-500 text-sm font-medium">Aún no hay clics en grupos registrados.</p>
                                </div>
                            )}
                            {stats?.groups?.map(([name, count]: any, idx: number) => (
                                <div key={name} className="group/item">
                                    <div className="flex justify-between items-end mb-2.5">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-black text-slate-600 tabular-nums">0{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-200 truncate group-hover/item:text-yellow-500 transition-colors uppercase tracking-tight">{name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-white tabular-nums">{count}</span>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase">clics</span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner p-[1px]">
                                        <div 
                                            className="h-full bg-gradient-to-r from-yellow-600 to-amber-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(202,138,4,0.3)]"
                                            style={{ width: `${(count / maxGroup) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 text-center">
                            <p className="text-[10px] text-yellow-500/60 uppercase font-black tracking-[0.2em] leading-relaxed">
                                Estas métricas ayudan a entender qué grupos están generando más curiosidad entre el público.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <footer className="text-center pt-10 pb-20">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" /> 
                        Sistema de Analíticas Integrado DINA 2026 
                        <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                    </p>
                </footer>
            </main>
        </div>
    );
}
