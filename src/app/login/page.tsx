"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Loader2, ChevronLeft, UserPlus } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/dashboard");
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.replace("/dashboard");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 bg-[grid-white-5%]">
            <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                <ChevronLeft size={20} /> Ir a la Web
            </Link>

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase">DINA <span className="text-[var(--primary)]">2026</span></h1>
                    <p className="text-gray-500 font-medium">Panel de Gestión para Escuelas</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Email (Usuario)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    required
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center animate-in shake font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--primary)] text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,204,0.3)] hover:shadow-[0_0_30px_rgba(255,0,204,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "ENTRAR"}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-sm mb-4">¿Aún no habéis registrado vuestro centro?</p>
                        <Link
                            href="/signup"
                            className="w-full border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <UserPlus size={18} /> REGISTRAR NUEVA ESCUELA
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
