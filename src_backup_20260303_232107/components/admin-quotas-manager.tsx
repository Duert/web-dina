'use client';

import React, { useState, useEffect } from 'react';
import { getCategoryQuotasAction, updateCategoryQuotaAction } from '@/app/actions-quotas';
import { ChevronDown, Plus, Minus, Ticket, RefreshCw } from 'lucide-react';

interface Quota {
    category_name: string;
    available_spots: number;
    total_opened: number;
    updated_at: string;
}

export default function AdminQuotasManager() {
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchQuotas = async () => {
        setLoading(true);
        const res = await getCategoryQuotasAction();
        if (res.success && res.quotas) {
            setQuotas(res.quotas);
        } else {
            alert("Error al cargar cupos: " + res.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchQuotas();
    }, []);

    const updateQuota = async (category: string, quota: Quota, change: number) => {
        const newVal = Math.max(0, quota.available_spots + change);
        if (newVal === quota.available_spots) return;

        const newTotal = Math.max(0, quota.total_opened + change);

        setUpdating(category);
        const res = await updateCategoryQuotaAction(category, newVal, newTotal);
        if (res.success) {
            setQuotas(prev => prev.map(q => q.category_name === category ? { ...q, available_spots: newVal, total_opened: newTotal } : q));
        } else {
            alert("Error al actualizar: " + res.message);
        }
        setUpdating(null);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando cupos...</div>;
    }

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Ticket className="text-emerald-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-300 to-teal-100 bg-clip-text text-transparent">Gestión de Plazas (Cupos)</h2>
                        <p className="text-gray-400 text-sm mt-1">Abre o cierra el cupo de plazas extra por categoría a partir del 2 de Mar.</p>
                    </div>
                </div>
                <button onClick={fetchQuotas} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quotas.map(quota => {
                        const takenSpots = quota.total_opened - quota.available_spots;
                        return (
                            <div key={quota.category_name} className={`flex items-center justify-between p-4 rounded-xl border ${quota.available_spots > 0 ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-white/5 border-white/10'} transition-all`}>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${quota.available_spots > 0 ? 'text-emerald-300' : 'text-gray-300'}`}>
                                        {quota.category_name}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-0.5">
                                        {quota.available_spots > 0 ? 'Plazas Abiertas' : 'Cerrado'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateQuota(quota.category_name, quota, -1)}
                                        disabled={quota.available_spots <= 0 || updating === quota.category_name}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>

                                    <div className={`flex flex-col items-center justify-center min-w-[3rem] px-2 ${updating === quota.category_name ? 'animate-pulse opacity-50' : ''}`}>
                                        <span className={`text-center font-black leading-none ${quota.available_spots > 0 ? 'text-emerald-400 text-xl' : 'text-gray-500 text-lg'}`}>
                                            {takenSpots}/{quota.total_opened}
                                        </span>
                                        <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                                            Ocupadas
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => updateQuota(quota.category_name, quota, 1)}
                                        disabled={updating === quota.category_name}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
