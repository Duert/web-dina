"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronRight, Layers, LayoutGrid } from "lucide-react";

import { sessions } from "@/lib/data";

export default function JudgesDashboard() {
    const router = useRouter();
    const [judgeName, setJudgeName] = useState("");
    const [judgeId, setJudgeId] = useState<number | null>(null);
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

    useEffect(() => {
        const session = localStorage.getItem('dina_judge_session');
        if (!session) {
            router.push('/judges');
            return;
        }

        // Use setTimeout to avoid state updates during initial render phase
        setTimeout(() => {
            try {
                const data = JSON.parse(session);
                setJudgeName(data.name);
                setJudgeId(data.id);
            } catch (e) {
                console.error("Invalid session data");
            }
        }, 0);
    }, [router]);

    const handleLogout = () => {
        if (confirm("¿Salir del panel de jurado?")) {
            localStorage.removeItem('dina_judge_session');
            router.push('/judges');
        }
    };

    const handleSelectCategory = (category: string) => {
        if (!selectedBlock) return;
        // Navigate to scoring list
        router.push(`/judges/vote?block=${selectedBlock}&category=${encodeURIComponent(category)}`);
    };

    // Derived categories from selected block
    const activeCategories = selectedBlock
        ? sessions.find(s => s.id === selectedBlock)?.categoryRows?.flat() || []
        : [];

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
                <div>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Panel de Jurado</p>
                    <h1 className="text-2xl font-black">Hola, {judgeName} <span className="text-pink-500">(Juez {judgeId})</span></h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-3 bg-zinc-900 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Step 1: Select Block */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Layers className="text-pink-500" /> 1. Selecciona el Bloque
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => setSelectedBlock(session.id)}
                                className={`p-6 rounded-2xl border-2 text-left transition-all ${selectedBlock === session.id
                                    ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                                    : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900'}`}
                            >
                                <span className={`block text-xs font-bold uppercase mb-1 ${selectedBlock === session.id ? 'text-pink-400' : 'text-zinc-500'}`}>
                                    Competición
                                </span>
                                <span className="text-lg font-bold">{session.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Step 2: Select Category */}
                {selectedBlock && (
                    <section className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <LayoutGrid className="text-blue-500" /> 2. Selecciona Categoría
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activeCategories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleSelectCategory(cat)}
                                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left flex items-center justify-between group"
                                >
                                    <span className="font-medium text-sm text-zinc-300 group-hover:text-white">{cat}</span>
                                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-white" />
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
