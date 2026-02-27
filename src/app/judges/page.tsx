"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Lock, ChevronRight, Loader2, UserCircle } from "lucide-react";
import { fetchJudgePool } from "@/app/actions-judges";

export default function JudgesLoginPage() {
    const router = useRouter();
    const [judgeId, setJudgeId] = useState<number | null>(null);
    const [selectedName, setSelectedName] = useState("");
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // Pool
    const [judgePool, setJudgePool] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPool = async () => {
            const res = await fetchJudgePool();
            if (res.success && res.data) {
                setJudgePool(res.data);
            }
            setLoading(false);
        };
        loadPool();
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!judgeId) {
            setError("Por favor, selecciona tu número de Juez");
            return;
        }

        if (!selectedName) {
            setError("Por favor, selecciona tu nombre de la lista");
            return;
        }

        if (pin !== "2026") {
            setError("Código incorrecto");
            return;
        }

        // Store session with dynamic name
        localStorage.setItem('dina_judge_session', JSON.stringify({
            id: judgeId,
            name: selectedName,
            loginTime: new Date().toISOString()
        }));

        router.push('/judges/dashboard');
    };

    if (loading) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black bg-gradient-to-br from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
                        JURADO
                    </h1>
                    <p className="text-zinc-500 text-sm tracking-widest uppercase">Dance IN Action 2026</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-8">
                    {/* Judge Selection Grid */}
                    <div className="space-y-4">
                        <label className="block text-center text-xs font-bold text-zinc-500 uppercase">1. ¿Qué número de Juez eres?</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((num) => {
                                const isSelected = judgeId === num;

                                return (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setJudgeId(num)}
                                        className={`p-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-2 ${isSelected
                                            ? 'border-pink-500 bg-pink-500/20 text-white'
                                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${isSelected ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-600'
                                            }`}>
                                            {num}
                                        </div>
                                        <span className="text-sm">JUEZ {num}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Name Selection - Only show if Judge ID selected */}
                    {judgeId && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-4 border-t border-zinc-800 space-y-4">
                            <label className="block text-center text-xs font-bold text-zinc-500 uppercase">2. ¿Quién eres?</label>

                            <div className="relative">
                                <UserCircle className="absolute left-4 top-3.5 text-zinc-500" size={20} />
                                <select
                                    value={selectedName}
                                    onChange={(e) => setSelectedName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-pink-500 focus:outline-none appearance-none transition-colors"
                                >
                                    <option value="">Selecciona tu nombre...</option>
                                    {judgePool.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-4 pointer-events-none">
                                    <ChevronRight className="rotate-90 text-zinc-600" size={16} />
                                </div>
                            </div>

                            {judgePool.length === 0 && (
                                <p className="text-xs text-red-400 text-center">
                                    No hay nombres configurados. Contacta con administración.
                                </p>
                            )}
                        </div>
                    )}

                    {/* PIN Input - Only show if Name selected */}
                    {judgeId && selectedName && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-4 border-t border-zinc-800">
                            <label className="block text-center text-xs font-bold text-zinc-500 uppercase mb-2">3. Código de Acceso</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-zinc-600" size={20} />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="••••"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-pink-500 focus:outline-none transition-colors text-center text-xl tracking-widest"
                                    maxLength={4}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center font-bold">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!judgeId || !selectedName || !pin}
                        className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:hover:bg-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 text-lg group"
                    >
                        Entrar <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
