"use client";

import { useState } from "react";
import { Seat } from "@/types";
import { SeatMap } from "@/components/seat-map";
import { X, Map as MapIcon, Maximize2 } from "lucide-react";

interface AdminSeatMapModalProps {
    sessionName: string;
    seats: Seat[];
    stats: {
        sold: number;
        total: number;
        revenue: number;
    };
}

export function AdminSeatMapModal({ sessionName, seats, stats }: AdminSeatMapModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
                <MapIcon size={16} />
                Ver Mapa
            </button>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0 relative z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{sessionName}</h2>
                        <p className="text-sm text-slate-500">
                            Ocupación: <span className="font-bold text-slate-900">{stats.sold}</span> / {stats.total}
                            <span className="mx-2">•</span>
                            Recaudación (Sesión): <span className="font-bold text-green-600">{stats.revenue}€</span>
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Map Body */}
                <div className="flex-1 bg-slate-100 overflow-hidden relative z-0">
                    <SeatMap
                        seats={seats}
                        readonly={true}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0 relative z-20">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

