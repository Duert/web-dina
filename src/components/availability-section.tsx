"use client";

import { useEffect, useState } from "react";
import { getAvailabilityStatsAction } from "@/app/actions";
import { sessions } from "@/lib/data";
import { Ticket, MapPin, Loader2 } from "lucide-react";

const SESSION_NAMES: Record<string, string> = {
    'block1': 'Bloque 1',
    'block2': 'Bloque 2',
    'block3': 'Bloque 3',
    'block4': 'Bloque 4'
};


export default function AvailabilitySection() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Pass a timestamp to bypass SWR/Client router caching of the server action
                const result = await getAvailabilityStatsAction(Date.now().toString());
                if (result.success && result.data) {
                    setStats(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch availability", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Optional: Refresh every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <section className="w-full py-20 bg-neutral-950 relative overflow-hidden flex justify-center items-center cursor-wait">
                <Loader2 className="animate-spin text-pink-500 w-8 h-8" />
            </section>
        );
    }

    return (
        <section className="w-full py-20 bg-neutral-950 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                        <Ticket className="text-[var(--primary)] w-6 h-6" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter text-center mb-2">
                        Estado de <span className="text-[var(--primary)]">Aforo</span>
                    </h2>
                    <p className="text-gray-500 text-center max-w-2xl">
                        Consulta la disponibilidad de entradas en tiempo real.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sessions.map((session) => {
                        const sessionStats = stats ? stats[session.id] || {} : {};
                        const isMorning = session.id === 'block1' || session.id === 'block2';

                        // Stats are already aggregated by the backend action
                        const aggregatedStats = {
                            'Patio de Butacas': {
                                available: sessionStats['Patio de Butacas']?.available || 0,
                                total: sessionStats['Patio de Butacas']?.total || 0
                            },
                            'Anfiteatro': {
                                available: sessionStats['Anfiteatro']?.available || 0,
                                total: sessionStats['Anfiteatro']?.total || 0
                            }
                        };

                        const displayZones = ['Patio de Butacas', 'Anfiteatro'];
                        const totalAvailable = aggregatedStats['Patio de Butacas'].available + aggregatedStats['Anfiteatro'].available;

                        return (
                            <div key={session.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--primary)]/50 transition-all group flex flex-col min-h-[460px]">
                                <div className="p-5 border-b border-white/5 bg-white/5 flex flex-col h-[220px]">
                                    {/* Period Label */}
                                    <div className="mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded-md ${isMorning ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                            {isMorning ? '☀️ MAÑANA' : '🌙 TARDE'}
                                        </span>
                                    </div>

                                    <div className="flex-none">
                                        <h3 className="text-xl font-black text-white mb-1">
                                            {SESSION_NAMES[session.id] || session.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <MapPin size={12} className="flex-shrink-0" />
                                            Teatro Municipal Carmen Tur
                                        </p>
                                    </div>

                                    {/* Categories - Centered in remaining space */}
                                    {session.categoryRows && (
                                        <div className="flex-1 flex flex-col justify-center gap-2 w-full mt-2">
                                            {session.categoryRows.map((row, rowIdx) => (
                                                <div key={rowIdx} className="flex justify-center gap-1 flex-wrap">
                                                    {row.map((cat, catIdx) => (
                                                        <span key={catIdx} className="text-[10px] font-medium bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 space-y-4 flex-1 flex flex-col justify-center">
                                    {displayZones.map(zoneName => {
                                        const zStats = aggregatedStats[zoneName as keyof typeof aggregatedStats];
                                        const { available, total } = zStats;
                                        const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
                                        const isSoldOut = available === 0;
                                        const isLow = !isSoldOut && percentage < 20;

                                        return (
                                            <div key={zoneName}>
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{zoneName}</span>
                                                    <span className={`text-xs font-bold ${isSoldOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-green-500'}`}>
                                                        {isSoldOut ? 'AGOTADO' : `${available} libres`}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isSoldOut ? 'bg-gray-600' : isLow ? 'bg-orange-500' : 'bg-green-500'}`}
                                                        style={{ width: `${total > 0 ? (available / total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex justify-between items-center mt-auto">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Total Bloque</span>
                                    <span className={`text-sm font-black ${totalAvailable === 0 ? 'text-gray-600' : 'text-white'}`}>
                                        {totalAvailable}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Soft decorative light */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent"></div>
        </section>
    );
}
