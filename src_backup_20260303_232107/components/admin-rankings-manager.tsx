'use client';

import { useState, useEffect } from 'react';
import { sessions } from '@/lib/data';
import { fetchRankingsStatus, toggleRankingPublication, fetchGlobalRankingsVisibility, toggleGlobalRankingsVisibility } from '@/app/actions-rankings';
import { Eye, EyeOff, Loader2, AlertCircle, Globe, Lock } from 'lucide-react';

export default function AdminRankingsManager() {
    const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});
    const [globalVisible, setGlobalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);
    const [togglingGlobal, setTogglingGlobal] = useState(false);

    const loadStatus = async () => {
        setLoading(true);
        const [statusRes, globalRes] = await Promise.all([
            fetchRankingsStatus(),
            fetchGlobalRankingsVisibility()
        ]);

        if (statusRes.success && statusRes.data) {
            const map: Record<string, boolean> = {};
            statusRes.data.forEach((item: any) => {
                map[`${item.block}-${item.category}`] = item.is_published;
            });
            setStatusMap(map);
        }

        if (globalRes.success) {
            setGlobalVisible(globalRes.isVisible);
        }
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadStatus();
    }, []);

    const handleGlobalToggle = async () => {
        setTogglingGlobal(true);
        const newState = !globalVisible;
        const res = await toggleGlobalRankingsVisibility(newState);
        if (res.success) {
            setGlobalVisible(newState);
        } else {
            alert("Error al cambiar visibilidad global: " + res.error);
        }
        setTogglingGlobal(false);
    };

    const handleToggle = async (blockId: string, category: string) => {
        const key = `${blockId}-${category}`;
        const currentStatus = statusMap[key] || false;
        const newStatus = !currentStatus;

        setToggling(key);
        const res = await toggleRankingPublication(blockId, category, newStatus);

        if (res.success) {
            setStatusMap(prev => ({
                ...prev,
                [key]: newStatus
            }));
        } else {
            alert("Error al actualizar estado: " + res.error);
        }
        setToggling(null);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /> Cargando estados...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Gestión de Clasificaciones Públicas</h2>
                    <p className="text-gray-400 text-sm">Controla la visibilidad de los resultados en la web pública (/rankings).</p>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${globalVisible ? 'bg-blue-900/20 border-blue-500/30' : 'bg-zinc-900/50 border-white/10'}`}>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase">Acceso Web (/rankings)</span>
                        <span className={`font-black ${globalVisible ? 'text-blue-400' : 'text-gray-500'}`}>
                            {globalVisible ? 'VISIBLE AL PÚBLICO' : 'OCULTO (Privado)'}
                        </span>
                    </div>
                    <button
                        onClick={handleGlobalToggle}
                        disabled={togglingGlobal}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${globalVisible ? 'bg-blue-600' : 'bg-zinc-700'}`}
                    >
                        <span
                            className={`${globalVisible ? 'translate-x-7' : 'translate-x-1'} inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                </div>
            </div>

            {/* Global Visibility Warning */}
            {!globalVisible && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3 text-yellow-200">
                    <Lock size={20} />
                    <p className="text-sm">
                        <strong>El acceso web está desactivado.</strong> Aunque publiques categorías individuales abajo, nadie podrá entrar a la página de clasificaciones hasta que actives el interruptor general arriba.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sessions.map((session) => (
                    <div key={session.id} className="bg-slate-950/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{session.name}</h3>
                            <span className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded">{session.id}</span>
                        </div>
                        <div className="p-2">
                            {session.categoryRows && session.categoryRows.flat().length > 0 ? (
                                <table className="w-full text-sm">
                                    <tbody>
                                        {session.categoryRows.flat().map((cat) => {
                                            const key = `${session.id}-${cat}`;
                                            const isPublished = statusMap[key] || false;

                                            return (
                                                <tr key={cat} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-medium text-gray-300">{cat}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleToggle(session.id, cat)}
                                                            disabled={toggling === key}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPublished
                                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                                                : 'bg-zinc-800 text-zinc-400 border border-white/10 hover:bg-zinc-700'
                                                                }`}
                                                        >
                                                            {toggling === key ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : isPublished ? (
                                                                <><Eye size={14} /> PUBLICADO</>
                                                            ) : (
                                                                <><EyeOff size={14} /> OCULTO</>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">Sin categorías</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-200">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>
                    <strong>Nota:</strong> Al publicar una categoría, la tabla de clasificación (ranking) aparecerá inmediatamente en la sección pública de la web.
                    Asegúrate de que todas las puntuaciones de ese bloque estén finalizadas antes de publicar.
                </p>
            </div>
        </div>
    );
}
