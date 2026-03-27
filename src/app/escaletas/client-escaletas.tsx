"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ClientEscaletas({ imagesMap, sessions }: { imagesMap: Record<string, string>, sessions: any[] }) {
    const router = useRouter();
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Get categories for selected block
    const blockCategories = selectedBlock 
        ? sessions.find(s => s.id === selectedBlock)?.categoryRows?.flat() || []
        : [];

    return (
        <div className="min-h-screen bg-black flex flex-col items-center">
            {/* Nav Header */}
            <div className="w-full bg-black border-b border-[#ff00cc]/30 p-4 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-[#ff00cc] hover:text-[#ff00cc]/80 flex items-center gap-2 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-bold text-sm tracking-widest uppercase">Volver</span>
                    </button>
                    {/* Pink Logo using mask-image trick on the white logo */}
                    <div 
                        className="w-[100px] h-[40px] bg-[#ff00cc]"
                        style={{ 
                            WebkitMaskImage: 'url(/logo-inscripciones-white.png)', 
                            WebkitMaskSize: 'contain', 
                            WebkitMaskRepeat: 'no-repeat', 
                            WebkitMaskPosition: 'center',
                            maskImage: 'url(/logo-inscripciones-white.png)', 
                            maskSize: 'contain', 
                            maskRepeat: 'no-repeat', 
                            maskPosition: 'center' 
                        }}
                    ></div>
                    <div className="w-16"></div> {/* Spacer to keep logo centered */}
                </div>
            </div>

            <main className="w-full max-w-4xl px-4 py-8 md:py-16 flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#ff00cc] drop-shadow-[0_0_15px_rgba(255,0,204,0.5)] mb-4">
                        Escaletas
                    </h1>
                    <p className="text-white/90 max-w-lg mx-auto font-medium">
                        Selecciona un bloque y luego la categoría para ver su escaleta.
                    </p>
                </div>

                <div className="w-full flex-col flex gap-10">
                    {/* Block Selection */}
                    <div className="flex flex-col items-center gap-6">
                        <h2 className="text-xl md:text-2xl font-bold text-[#ff00cc]">1. Selecciona el Bloque</h2>
                        <div className="flex flex-wrap justify-center gap-4">
                            {sessions.map((session: any) => (
                                <button
                                    key={session.id}
                                    onClick={() => {
                                        if (selectedBlock !== session.id) {
                                            setSelectedBlock(session.id);
                                            setSelectedCategory(null);
                                        }
                                    }}
                                    className={`px-8 py-4 rounded-xl font-black text-lg transition-all border-2 ${
                                        selectedBlock === session.id 
                                            ? "bg-[#ff00cc] text-white border-[#ff00cc] shadow-[0_0_25px_rgba(255,0,204,0.6)] scale-105" 
                                            : "bg-black text-white border-[#ff00cc]/50 hover:border-[#ff00cc] hover:bg-[#ff00cc]/20"
                                    }`}
                                >
                                    {session.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Selection */}
                    {selectedBlock && (
                        <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <h2 className="text-xl md:text-2xl font-bold text-[#ff00cc]">2. Selecciona la Categoría</h2>
                            {blockCategories.length === 0 ? (
                                <p className="text-[#ff00cc]/70">No hay categorías en este bloque.</p>
                            ) : (
                                <div className="flex flex-wrap justify-center gap-3 max-w-2xl px-2">
                                    {blockCategories.map((cat: string) => {
                                        const hasImage = !!imagesMap[cat];
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-6 py-3 rounded-xl font-bold transition-all border ${
                                                    selectedCategory === cat 
                                                        ? "bg-[#ff00cc] text-white border-[#ff00cc] shadow-[0_0_20px_rgba(255,0,204,0.5)] scale-105" 
                                                        : hasImage 
                                                            ? "bg-black text-white border-[#ff00cc]/50 hover:border-[#ff00cc]/90 hover:bg-[#ff00cc]/20"
                                                            : "bg-black/30 text-white/50 border-[#ff00cc]/20 hover:border-[#ff00cc]/40 hover:text-white/80"
                                                }`}
                                            >
                                                {cat} {!hasImage && <span className="text-xs ml-1 opacity-70 font-normal">(sin escaleta)</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Image Viewer */}
                    {selectedCategory && (
                        <div className="mt-6 animate-in fade-in zoom-in-95 duration-500 w-full flex flex-col items-center">
                            {imagesMap[selectedCategory] ? (
                                <div className="relative w-full max-w-3xl aspect-[4/5] md:aspect-auto md:h-[700px] rounded-2xl overflow-hidden bg-black border border-[#ff00cc]/50 shadow-[0_0_40px_rgba(255,0,204,0.3)] p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={imagesMap[selectedCategory]} 
                                        alt={`Escaleta para ${selectedCategory}`}
                                        className="w-full h-full object-contain rounded-xl"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 bg-black border border-[#ff00cc]/30 rounded-3xl text-center w-full max-w-2xl shadow-[0_0_20px_rgba(255,0,204,0.1)]">
                                    <div className="w-16 h-16 bg-[#ff00cc]/10 rounded-full flex items-center justify-center mb-4">
                                        <span className="text-[#ff00cc] font-black text-3xl">!</span>
                                    </div>
                                    <h2 className="text-xl font-bold mb-2 text-[#ff00cc]">Escaleta no disponible</h2>
                                    <p className="text-[#ff00cc]/70">El orden está publicado pero todavía no se ha subido la escaleta para la categoría {selectedCategory}.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
