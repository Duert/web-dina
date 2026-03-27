import { fetchJudgesGlobalConfig, fetchAllEscaletas } from "@/app/actions-judges";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { sessions } from "@/lib/data";
import ClientEscaletas from "./client-escaletas";

export const metadata = {
    title: "Escaletas - Dance IN Action",
    description: "Órdenes de actuación por categoría.",
};

export default async function EscaletasPage() {
    const configRes = await fetchJudgesGlobalConfig();
    const isPublished = configRes.data?.is_order_published || false;
    
    const escaletasRes = await fetchAllEscaletas();
    const imagesMap = escaletasRes.data || {};

    if (!isPublished) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center">
                <div className="w-full bg-black border-b border-[#ff00cc]/30 p-4 sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <Link href="/" className="text-[#ff00cc] hover:text-[#ff00cc]/80 flex items-center gap-2 transition-colors">
                            <ArrowLeft size={20} />
                            <span className="font-bold text-sm tracking-widest uppercase">Volver</span>
                        </Link>
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
                        <div className="w-16"></div>
                    </div>
                </div>

                <main className="w-full max-w-4xl px-4 py-8 md:py-16 flex-1 flex flex-col justify-center items-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex flex-col items-center justify-center p-12 bg-black border border-[#ff00cc]/30 rounded-3xl text-center shadow-[0_0_30px_rgba(255,0,204,0.15)] w-full max-w-2xl">
                        <div className="w-20 h-20 bg-[#ff00cc]/10 rounded-full flex items-center justify-center mb-6 border border-[#ff00cc]/40 shadow-[0_0_15px_rgba(255,0,204,0.3)]">
                            <span className="text-[#ff00cc] font-black text-4xl">?</span>
                        </div>
                        <h2 className="text-3xl font-black mb-3 text-[#ff00cc]">Próximamente</h2>
                        <p className="text-[#ff00cc]/70 text-lg max-w-md">El orden de actuación aún no ha sido publicado. Vuelve más adelante para consultar los diseños y horarios del campeonato.</p>
                    </div>
                </main>
            </div>
        );
    }

    return <ClientEscaletas imagesMap={imagesMap} sessions={sessions} />;
}
