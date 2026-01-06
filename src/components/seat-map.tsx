"use client";

import { useMemo, useState } from "react";
import { Seat, Zone } from "@/types";
import { cn } from "@/lib/utils";
import { Check, User, Ban, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SeatMapProps {
    seats: Seat[];
    selectedSeats?: Seat[];
    onSeatToggle?: (seat: Seat, e: React.MouseEvent) => void;
    readonly?: boolean;
}

const ZONE_STYLES: Record<Zone, string> = {
    Preferente: "bg-white border-2 border-indigo-600 text-indigo-900 font-bold hover:bg-indigo-50",
    "Zona 2": "bg-white border-2 border-emerald-600 text-emerald-900 font-bold hover:bg-emerald-50",
    "Zona 3": "bg-white border-2 border-amber-600 text-amber-900 font-bold hover:bg-amber-50",
    PMR: "bg-pink-100 border-2 border-pink-500 text-pink-900 font-bold hover:bg-pink-200",
};

const STATUS_STYLES = {
    available: "cursor-pointer",
    sold: "bg-gray-300 border-2 border-gray-400 text-gray-500 cursor-not-allowed",
    reserved: "bg-yellow-200 border-2 border-yellow-400 text-yellow-700 cursor-not-allowed",
    blocked: "bg-red-200 border-2 border-red-400 text-red-700 cursor-not-allowed",
};

export function SeatMap({ seats, selectedSeats = [], onSeatToggle, readonly = false }: SeatMapProps) {
    const [scale, setScale] = useState(0.6); // Start at 60% as requested

    const rows = useMemo(() => {
        const grouped: Record<number, Seat[]> = {};

        const maxRow = Math.max(...seats.map((s) => s.row));
        for (let i = 1; i <= maxRow; i++) {
            grouped[i] = seats.filter((s) => s.row === i);
        }
        return grouped;
    }, [seats]);

    const isSelected = (seat: Seat) => selectedSeats.some((s) => s.id === seat.id);

    return (
        <div className="flex flex-col h-full w-full bg-white relative">

            {/* Map Container - Now includes Stage for unified scaling/alignment */}
            <div className="flex-1 overflow-auto p-8 bg-white cursor-grab active:cursor-grabbing">
                <div
                    className="flex flex-col items-center space-y-8 transition-transform duration-200 origin-top-left w-fit"
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Stage - Moved inside to scale and align with seats */}
                    <div className="w-[600px] border-2 border-black py-4 text-center text-3xl font-bold uppercase tracking-widest text-black shrink-0">
                        Escenario
                    </div>

                    {/* Seats Rows */}
                    <div className="flex flex-col items-center space-y-1">
                        {Object.entries(rows).map(([rowNum, rowSeats]) => {
                            const r = parseInt(rowNum);

                            // STRICT SPLIT LOGIC
                            // Left Side (Odds)
                            const leftInner = rowSeats.filter(s => s.number % 2 !== 0 && s.number <= 21).sort((a, b) => b.number - a.number); // 21...1
                            const leftOuter = rowSeats.filter(s => s.number % 2 !== 0 && s.number >= 23).sort((a, b) => b.number - a.number); // ...23

                            // Right Side (Evens)
                            const rightInner = rowSeats.filter(s => s.number % 2 === 0 && s.number <= 22).sort((a, b) => a.number - b.number); // 2...22
                            const rightOuter = rowSeats.filter(s => s.number % 2 === 0 && s.number >= 24).sort((a, b) => a.number - b.number); // 24...

                            return (
                                <div
                                    key={rowNum}
                                    className={cn(
                                        "flex items-center justify-center", // Center the whole row in the container
                                        r === 9 && "mb-10" // Uniform thickness matching vertical aisles (w-10)
                                    )}
                                >
                                    {/* ---- LEFT WING ---- */}

                                    {/* Row Number Left */}
                                    <div className="w-16 text-right pr-6 font-bold text-gray-400 text-xs shrink-0 select-none">{rowNum}</div>

                                    {/* 1. LEFT OUTER BLOCK (Seats > 22) */}
                                    <div className="flex justify-end gap-0.5 w-[280px] shrink-0">
                                        {leftOuter.map(seat => (
                                            <SeatButton key={seat.id} seat={seat} selected={isSelected(seat)} onSeatToggle={onSeatToggle} readonly={readonly} />
                                        ))}
                                    </div>

                                    {/* AISLE GAP LEFT */}
                                    <div className="w-10 shrink-0"></div>

                                    {/* 2. LEFT INNER BLOCK (Seats <= 21) */}
                                    <div className="flex justify-end gap-0.5 w-[310px] shrink-0">
                                        {leftInner.map(seat => (
                                            <SeatButton key={seat.id} seat={seat} selected={isSelected(seat)} onSeatToggle={onSeatToggle} readonly={readonly} />
                                        ))}
                                    </div>


                                    {/* ---- CENTER AISLE ---- */}
                                    <div className="w-16 flex justify-center items-center text-xs font-bold text-gray-300 select-none shrink-0">
                                        {rowNum}
                                    </div>


                                    {/* ---- RIGHT WING ---- */}

                                    {/* 3. RIGHT INNER BLOCK (Seats <= 22) */}
                                    <div className="flex justify-start gap-0.5 w-[310px] shrink-0">
                                        {rightInner.map(seat => (
                                            <SeatButton key={seat.id} seat={seat} selected={isSelected(seat)} onSeatToggle={onSeatToggle} readonly={readonly} />
                                        ))}
                                    </div>

                                    {/* AISLE GAP RIGHT */}
                                    <div className="w-10 shrink-0"></div>

                                    {/* 4. RIGHT OUTER BLOCK (Seats > 22) */}
                                    <div className="flex justify-start gap-0.5 w-[280px] shrink-0">
                                        {rightOuter.map(seat => (
                                            <SeatButton key={seat.id} seat={seat} selected={isSelected(seat)} onSeatToggle={onSeatToggle} readonly={readonly} />
                                        ))}
                                    </div>

                                    {/* Row Number Right */}
                                    <div className="w-16 text-left pl-6 font-bold text-gray-400 text-xs shrink-0 select-none">{rowNum}</div>

                                </div>
                            )
                        })}
                    </div>

                    {/* Legend - Moved inside scale container to be close to last row */}
                    <div className="mt-12 border-t pt-4 flex items-center justify-center gap-2">
                        <div className="w-6 h-6 bg-pink-100 border-2 border-pink-500 rounded-md shrink-0"></div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Plazas reservadas PMR (personas con movilidad reducida)</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-200 z-50">
                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="Zoom In">
                    <ZoomIn size={20} className="text-slate-700" />
                </button>
                <div className="text-center text-xs font-bold text-slate-500 py-1 border-y border-slate-100 my-1">{Math.round(scale * 100)}%</div>
                <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="Zoom Out">
                    <ZoomOut size={20} className="text-slate-700" />
                </button>
                <button onClick={() => setScale(0.6)} className="p-2 hover:bg-slate-100 rounded-md transition-colors border-t border-slate-100 mt-1" title="Restablecer Zoom">
                    <RotateCcw size={16} className="text-slate-500" />
                </button>
            </div>
        </div>
    );
}

function settingsForSeat(seat: Seat, selected: boolean) {
    if (seat.status === 'sold') return STATUS_STYLES.sold;
    if (seat.status === 'reserved') return STATUS_STYLES.reserved;
    if (seat.status === 'blocked') return STATUS_STYLES.blocked;

    if (selected) return "bg-gray-900 text-white border-2 border-gray-900 shadow-md scale-110 z-20";

    return ZONE_STYLES[seat.zone];
}

function SeatButton({ seat, selected, onSeatToggle, readonly }: { seat: Seat, selected: boolean, onSeatToggle?: (s: Seat, e: React.MouseEvent) => void, readonly: boolean }) {
    const isSold = seat.status === 'sold';
    return (
        <button
            disabled={seat.status !== 'available' || readonly}
            onClick={(e) => !readonly && onSeatToggle && onSeatToggle(seat, e)}
            title={`${seat.zone} - Fila ${seat.row} | Asiento ${seat.number}`}
            className={cn(
                "w-6 h-6 flex items-center justify-center text-[9px] font-bold transition-all duration-200 rounded-[2px] shrink-0 select-none",
                settingsForSeat(seat, selected)
            )}
        >
            {isSold ? <User size={10} className="opacity-0" /> : selected ? <Check size={12} strokeWidth={4} /> : seat.number}
        </button>
    )
}
