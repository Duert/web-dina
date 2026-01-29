"use client";

import Link from "next/link";
import { Clock, ChevronLeft } from "lucide-react";

export default function PendingApprovalPage() {
    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center bg-[grid-white-5%]">
            <div className="w-24 h-24 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mb-8 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-pulse">
                <Clock size={48} />
            </div>

            <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">
                Solicitud <span className="text-yellow-500">Recibida</span>
            </h1>

            <p className="text-gray-400 max-w-lg mb-8 text-lg leading-relaxed">
                Tu cuenta ha sido creada correctamente, pero requiere <strong>validación manual</strong> por parte de la organización.
                <br /><br />
                Recibirás un aviso cuando tu acceso haya sido activado. Por favor, ten paciencia.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                <Link
                    href="/login"
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} /> Volver al Login
                </Link>
            </div>
        </div>
    );
}
