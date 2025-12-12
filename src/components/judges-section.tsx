"use client";

import { createClient } from "@supabase/supabase-js";
import { User, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Client Component
export default function JudgesSection() {
    const [judges, setJudges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const fetchJudges = async () => {
            const { data } = await supabase
                .from('judges')
                .select('*')
                .eq('visible', true)
                .order('display_order', { ascending: true });

            if (data) setJudges(data);
            setLoading(false);
        };

        fetchJudges();
    }, []);

    if (loading) {
        return (
            <section className="w-full py-20 bg-neutral-950 relative overflow-hidden flex justify-center items-center">
                <Loader2 className="animate-spin text-pink-500 w-8 h-8" />
            </section>
        );
    }

    return (
        <section className="w-full py-20 bg-neutral-950 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    JURADO <span className="text-[var(--primary)]">2026</span>
                </h2>

                {!judges || judges.length === 0 ? (
                    // COMING SOON STATE
                    <div className="mt-12 max-w-2xl mx-auto">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-12 rounded-3xl flex flex-col items-center animate-in fade-in zoom-in duration-700">
                            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,0,204,0.4)]">
                                <User size={40} className="text-white" />
                            </div>
                            <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 uppercase">Próximamente</h3>
                            <p className="text-pink-200/80 text-lg">Estamos confirmando el panel de expertos para esta edición.</p>
                        </div>
                    </div>
                ) : (
                    // JUDGES GRID
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {judges.map((judge) => (
                            <div key={judge.id} className="group relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)] to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                                <div className="relative bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden hover:border-[var(--primary)]/50 transition-colors duration-300">
                                    {/* Image Container */}
                                    <div className="aspect-[3/4] overflow-hidden bg-neutral-800 relative">
                                        <img
                                            src={judge.image_url}
                                            alt={judge.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                    </div>

                                    {/* Content */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 text-left">
                                        <p className="text-[var(--primary)] font-bold text-xs tracking-widest uppercase mb-1">{judge.role}</p>
                                        <h3 className="text-2xl font-black text-white uppercase italic">{judge.name}</h3>
                                        {judge.bio && (
                                            <p className="text-gray-400 text-xs mt-2 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                                {judge.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
