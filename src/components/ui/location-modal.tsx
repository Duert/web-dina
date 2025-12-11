"use client";

import { X, MapPin } from "lucide-react";
import Image from "next/image";

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-neutral-900 border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Left Column: Info & Photo */}
                    <div className="w-full md:w-1/3 p-8 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/10 bg-black/40">
                        <div>
                            <h2 className="text-2xl font-black text-white leading-tight mb-2">
                                Auditorio Leopoldo Peñaroja
                            </h2>
                            <p className="text-[var(--primary)] font-medium flex items-center gap-2">
                                <MapPin size={16} /> La Vall d'Uixó
                            </p>
                        </div>

                        <div className="space-y-4 text-sm text-gray-400">
                            <p>
                                Polígono La Moleta, 1<br />
                                12600 La Vall d'Uixó<br />
                                Castellón, España
                            </p>
                        </div>

                        {/* Static Image Display */}
                        <div className="flex-1 min-h-[200px] bg-neutral-800 rounded-xl overflow-hidden relative border border-white/5 flex items-center justify-center">
                            <Image
                                src="/auditorium.jpg"
                                alt="Fachada Auditorio"
                                fill
                                className="object-cover"
                                onError={(e) => {
                                    // Fallback if image doesn't exist
                                    const target = e.target as HTMLImageElement;
                                    target.src = "https://images.unsplash.com/photo-1544983849-550a6b57116b?q=80&w=1000&auto=format&fit=crop"; // Generic fallback
                                }}
                            />
                            {/* Optional: Add a subtle overlay so it looks nice but isn't clickable */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-4 left-4 z-10">
                                <span className="bg-[var(--primary)] text-white text-xs font-bold px-2 py-1 rounded">Foto Oficial</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interactive Map */}
                    <div className="w-full md:w-2/3 h-[400px] md:h-auto bg-neutral-800 relative">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3066.456637837777!2d-0.2379984!3d39.8204145!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd600f7a7b88888b%3A0x6b88888888888888!2sAuditori%20Leopoldo%20Pe%C3%B1arroja!5e0!3m2!1ses!2ses!4v1700000000000!5m2!1ses!2ses"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="grayscale contrast-125 invert-[.9] brightness-90 hover:grayscale-0 transition-all duration-500" // Map styling to match dark theme initially, color on hover
                        ></iframe>

                        {/* Overlay text on map */}
                        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 pointer-events-none">
                            <p className="text-white font-bold text-xs">Ver en Google Maps</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
