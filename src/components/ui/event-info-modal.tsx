"use strict";

import { X, Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { useEffect, useState } from "react";

interface EventInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EventInfoModal({ isOpen, onClose }: EventInfoModalProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShow(true);
        } else {
            setTimeout(() => setShow(false), 300);
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
                    <p className="text-[var(--primary)] font-bold tracking-widest text-sm">FECHA POR CONFIRMAR</p>
                </div>

                {/* Content */}
                <div className="space-y-6">

                    {/* Schedule */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-white/10 p-2 rounded-lg shrink-0">
                                <Clock className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm mb-1">MAÑANA: Categorías Infantiles</h3>
                                <div className="space-y-1 text-xs text-gray-400">
                                    <p>• <span className="text-white">09:30</span> - Apertura de Puertas</p>
                                    <p>• <span className="text-white">10:30</span> - Inicio Competición Infantil</p>
                                    <p>• <span className="text-white">13:30</span> - Entrega de Premios</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/5"></div>

                        <div className="flex items-start gap-4">
                            <div className="bg-white/10 p-2 rounded-lg shrink-0">
                                <Clock className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm mb-1">TARDE: Juvenil y Absoluta</h3>
                                <div className="space-y-1 text-xs text-gray-400">
                                    <p>• <span className="text-white">16:00</span> - Apertura de Puertas</p>
                                    <p>• <span className="text-white">17:00</span> - Inicio Competición</p>
                                    <p>• <span className="text-white">20:30</span> - Entrega de Premios</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Info Removed as per request */}

                </div>
            </div>
        </div>
    );
}
