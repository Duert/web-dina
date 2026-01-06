"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    FileText,
    CheckCircle2,
    Clock,
    ChevronRight,
    LogOut,
    User as UserIcon,
    Loader2,
    Building2,
    Settings,
    ShieldCheck
} from "lucide-react";
import { Registration } from "@/types";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            // Fetch Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(profileData);

            fetchRegistrations(user.id);
        };

        checkUser();
    }, [router]);

    const fetchRegistrations = async (userId: string) => {
        const { data, error } = await supabase
            .from('registrations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setRegistrations(data || []);
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="text-[var(--primary)] animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-[var(--primary)] selection:text-white">
            {/* Nav */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 group">
                        <span className="bg-[var(--primary)] text-white w-8 h-8 flex items-center justify-center rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-pink-500/20">D</span>
                        <span className="hidden sm:inline">DINA <span className="text-[var(--primary)]">2026</span></span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 text-gray-400 text-sm bg-white/5 px-4 py-2 rounded-2xl border border-white/10 group hover:border-white/20 transition-all">
                            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                <UserIcon size={12} className="group-hover:text-white transition-colors" />
                            </div>
                            <span>{user?.email}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 p-2.5 rounded-2xl transition-all"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-12">

                {/* PROFILE HEADER */}
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[2rem] p-8 md:p-12 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Building2 size={160} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-[var(--primary)] font-black uppercase tracking-[0.2em] text-xs mb-4">
                            <ShieldCheck size={14} /> Panel Autorizado
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase leading-none">
                            {profile?.school_name || "TU ESCUELA"}
                        </h1>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-gray-400">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <UserIcon size={16} />
                                <span className="text-sm font-medium">{profile?.rep_name} {profile?.rep_surnames}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Building2 size={16} />
                                <span className="text-sm font-medium">Centro Registrado</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">Inscripciones <span className="text-gray-600">({registrations.length})</span></h2>
                    </div>
                    <Link
                        href="/registration"
                        className="bg-[var(--primary)] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} /> Nueva Inscripción
                    </Link>
                </div>

                {registrations.length === 0 ? (
                    <div className="bg-white/2 border-2 border-dashed border-white/5 rounded-[2rem] p-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="text-gray-700" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-300 mb-2 tracking-tight">Todavía no habéis inscrito ningún grupo</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">Podéis empezar ahora mismo y guardar el borrador si os falta algún dato.</p>
                        <Link
                            href="/registration"
                            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Comenzar Inscripción
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {registrations.map((reg) => (
                            <div
                                key={reg.id}
                                className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => router.push(`/registration?id=${reg.id}`)}
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`mt-1 p-3 rounded-2xl border ${reg.status === 'submitted' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                                        {reg.status === 'submitted' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white group-hover:text-[var(--primary)] transition-colors leading-tight uppercase tracking-tight">{reg.group_name}</h3>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                                            <div className="flex items-center gap-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</span>
                                                <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">{reg.category}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Actualizado</span>
                                                <span className="text-xs font-bold text-gray-400">{new Date(reg.created_at!).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <div className={`text-[11px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full inline-block mb-1 shadow-sm ${reg.status === 'submitted' ? 'bg-green-500 text-white' : 'bg-orange-500 text-black'}`}>
                                            {reg.status === 'submitted' ? 'ENVIADO' : 'BORRADOR'}
                                        </div>
                                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">
                                            Click para {reg.status === 'submitted' ? 'ver' : 'continuar'}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all text-gray-600">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
