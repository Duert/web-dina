"use strict";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface EventInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EventInfoModal({ isOpen, onClose }: EventInfoModalProps) {
    const [show, setShow] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            // Delay to avoid synchronous setState warning
            const timer = setTimeout(() => setShow(true), 0);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setShow(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!show && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

            <div className={`relative bg-neutral-900 border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white mb-1">PROGRAMA</h2>
                    <p className="text-[var(--primary)] font-bold tracking-widest text-sm">29 DE MARZO DE 2026</p>
                    <p className="text-gray-500 text-xs mt-2 italic">(Horario aproximado)</p>
                </div>

                {/* Content */}
                <div className="space-y-6">

                    {/* Schedule */}
                    {/* Schedule */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* MAÑANA */}
                        <div className="space-y-4">
                            <h3 className="text-pink-400 font-black text-sm tracking-wider uppercase border-b border-pink-500/20 pb-2">Mañana</h3>

                            {/* Bloque 1 - 09:00h */}
                            <div className="pl-2 border-l-2 border-white/10 ml-1">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-white font-bold text-sm">Bloque 1</h4>
                                    <span className="text-xs text-pink-300 font-mono">09:00h - 10:15h</span>
                                </div>
                                <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                                    <li>• Infantil</li>
                                    <li>• Infantil Mini-parejas</li>
                                </ul>
                            </div>

                            {/* Bloque 2 - 10:45h */}
                            <div className="pl-2 border-l-2 border-white/10 ml-1">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-white font-bold text-sm">Bloque 2</h4>
                                    <span className="text-xs text-pink-300 font-mono">10:45h - 12:45h</span>
                                </div>
                                <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                                    <li>• Junior</li>
                                    <li>• Junior Mini-parejas</li>
                                    <li>• Mini-Solistas Junior</li>
                                </ul>
                            </div>
                        </div>

                        {/* TARDE */}
                        <div className="space-y-4">
                            <h3 className="text-indigo-400 font-black text-sm tracking-wider uppercase border-b border-indigo-500/20 pb-2">Tarde</h3>

                            {/* Bloque 3 - 15:00h */}
                            <div className="pl-2 border-l-2 border-white/10 ml-1">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-white font-bold text-sm">Bloque 3</h4>
                                    <span className="text-xs text-indigo-300 font-mono">15:00h - 16:15h</span>
                                </div>
                                <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                                    <li>• Juvenil</li>
                                    <li>• Juvenil Parejas</li>
                                </ul>
                            </div>

                            {/* Bloque 4 - 16:45h */}
                            <div className="pl-2 border-l-2 border-white/10 ml-1">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="text-white font-bold text-sm">Bloque 4</h4>
                                    <span className="text-xs text-indigo-300 font-mono">16:45h - 18:30h</span>
                                </div>
                                <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                                    <li>• Absoluta</li>
                                    <li>• Parejas</li>
                                    <li>• Solistas Absoluta</li>
                                    <li>• Premium</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Location Info Removed as per request */}

                </div>
            </div>
        </div >
    );
}
