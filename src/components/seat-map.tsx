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
    blocked: "bg-red-500 border-2 border-red-700 text-white font-bold cursor-pointer hover:bg-red-600", // Clickable to unblock
};

// Gap configuration: For each row range, add a gap AFTER these seat numbers
const GAP_CONFIG = [
    // PATI BUTAQUES (Rows 1-17): 20..11 | GAP | 10..1
    // In descending order, we iterate 20->1. The gap is after 11.
    { minRow: 1, maxRow: 17, gapsAfter: [11] },

    // ANFITEATRE (Rows 18-25)
    // Rows 1-4 (18-21): 24 seats -> 24..19 | GAP | 18..7 | GAP | 6..1
    // Gaps after 19 and 7.
    { minRow: 18, maxRow: 21, gapsAfter: [19, 7] },

    // Rows 5-8 (22-25): 16 seats -> 16..13 | GAP | 12..5 | GAP | 4..1
    // Gaps after 13 and 5.
    { minRow: 22, maxRow: 25, gapsAfter: [13, 5] },
];

export function SeatMap({ seats, selectedSeats = [], onSeatToggle, readonly = false }: SeatMapProps) {
    const [scale, setScale] = useState(0.8);
    const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
    const [hoveredSchool, setHoveredSchool] = useState<string | null>(null);
    const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; groupName: string; schoolName: string; tickets: number } | null>(null);

    const rows = useMemo(() => {
        if (!seats || !Array.isArray(seats) || seats.length === 0) return {};

        const grouped: Record<number, Seat[]> = {};

        try {
            const validSeats = seats.filter(s => s && typeof s.row === 'number');
            if (validSeats.length === 0) return {};

            const maxRow = Math.max(...validSeats.map((s) => s.row));
            const minRow = Math.min(...validSeats.map((s) => s.row));

            for (let i = minRow; i <= maxRow; i++) {
                grouped[i] = validSeats
                    .filter((s) => s.row === i)
                    .sort((a, b) => b.number - a.number); // Descending order (Seat 1 on Right)
            }
        } catch (e) {
            console.error("Error processing seat map rows:", e);
            return {};
        }

        return grouped;
    }, [seats]);

    // Metadata map for schools/groups to avoid repeated lookups
    const seatMetadata = useMemo(() => {
        const meta: Record<string, { group: string, school: string }> = {};
        seats.forEach(s => {
            if (s.status === 'sold') {
                meta[s.id] = {
                    group: s.groupName || s.assignedTo || 'Sin grupo',
                    school: s.schoolName || 'Sin escuela'
                };
            }
        });
        return meta;
    }, [seats]);

    const isSelected = (seat: Seat) => selectedSeats.some((s) => s.id === seat.id);

    // Comprobar si una butaca pertenece al grupo o escuela destacada
    const getHighlightLevel = (seat: Seat): 'none' | 'group' | 'school' => {
        if (seat.status !== 'sold') return 'none';
        
        const group = seat.groupName || seat.assignedTo;
        const school = seat.schoolName;

        if (hoveredGroup && group === hoveredGroup) return 'group';
        if (hoveredSchool && school === hoveredSchool) return 'school';
        
        return 'none';
    };

    // Helper to check gaps
    const getGapsForRow = (row: number) => {
        const config = GAP_CONFIG.find(c => row >= c.minRow && row <= c.maxRow);
        return config ? config.gapsAfter : [];
    };

    return (
        <div className="flex flex-col h-full w-full bg-white relative">

            {/* Tooltip de información del grupo */}
            {tooltipInfo && (
                <div
                    className="fixed z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl pointer-events-none border border-white/10 flex flex-col gap-1 min-w-[200px]"
                    style={{
                        left: `${tooltipInfo.x + 15}px`,
                        top: `${tooltipInfo.y - 10}px`,
                        transform: 'translateY(-100%)'
                    }}
                >
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grupo</span>
                            <span className="font-bold text-sm text-yellow-400">{tooltipInfo.groupName}</span>
                        </div>
                        <div className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-black">{tooltipInfo.tickets} BUT.</div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Escuela</span>
                        <span className="text-xs font-semibold text-white">{tooltipInfo.schoolName}</span>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div className="flex-1 overflow-auto p-8 bg-white cursor-grab active:cursor-grabbing">
                <div
                    className="flex flex-col items-center space-y-2 transition-transform duration-200 origin-top-center w-fit mx-auto"
                    style={{ transform: `scale(${scale})` }}
                >
                    {/* Stage */}
                    <div className="w-[600px] border-2 border-black py-4 mb-12 text-center text-3xl font-bold uppercase tracking-widest text-black shrink-0">
                        Escenario
                    </div>

                    {/* PATI BUTAQUES (Stalls) Label */}
                    <div className="text-xl font-bold tracking-widest text-gray-400 mb-4">PATI DE BUTAQUES</div>

                    {/* Seats Rows (1-17) */}
                    {Object.entries(rows)
                        .filter(([r]) => parseInt(r) <= 17)
                        .map(([rowNum, rowSeats]) => {
                            const r = parseInt(rowNum);
                            const gaps = getGapsForRow(r);

                            return (
                                <RowRenderer
                                    key={rowNum}
                                    rowNum={r}
                                    seats={rowSeats}
                                    gaps={gaps}
                                    isSelected={isSelected}
                                    getHighlightLevel={getHighlightLevel}
                                    onSeatToggle={onSeatToggle}
                                    onSeatHover={(seat: Seat | null, e?: React.MouseEvent) => {
                                        if (!seat) {
                                            setHoveredGroup(null);
                                            setHoveredSchool(null);
                                            setTooltipInfo(null);
                                        } else if (seat.status === 'sold') {
                                            const group = seat.groupName || seat.assignedTo || 'Desconocido';
                                            const school = seat.schoolName || 'Sin escuela';
                                            const ticketsCount = seats.filter(s => 
                                                s.status === 'sold' && 
                                                (s.groupName === group || s.assignedTo === group) && 
                                                s.schoolName === school
                                            ).length;

                                            setHoveredGroup(group);
                                            setHoveredSchool(school);
                                            if (e) {
                                                setTooltipInfo({ 
                                                    x: e.clientX, 
                                                    y: e.clientY, 
                                                    groupName: group, 
                                                    schoolName: school, 
                                                    tickets: ticketsCount 
                                                });
                                            }
                                        }
                                    }}
                                    readonly={readonly}
                                />
                            );
                        })}

                    {/* Spacer / Divider */}
                    <div className="h-16 w-full border-t border-dashed border-gray-300 my-8 relative">
                    </div>

                    {/* ANFITEATRE Label */}
                    <div className="text-xl font-bold tracking-widest text-gray-400 mb-4">ANFITEATRE</div>

                    {/* Seats Rows (18-25) */}
                    {Object.entries(rows)
                        .filter(([r]) => parseInt(r) >= 18)
                        .map(([rowNum, rowSeats]) => {
                            const r = parseInt(rowNum);
                            // Display Row Number: Mapped (18 -> 1, 19 -> 2...)
                            const displayRow = r - 17;
                            const gaps = getGapsForRow(r);

                            return (
                                <RowRenderer
                                    key={rowNum}
                                    rowNum={r}
                                    displayRowNum={displayRow}
                                    seats={rowSeats}
                                    gaps={gaps}
                                    isSelected={isSelected}
                                    getHighlightLevel={getHighlightLevel}
                                    onSeatToggle={onSeatToggle}
                                    onSeatHover={(seat: Seat | null, e?: React.MouseEvent) => {
                                        if (!seat) {
                                            setHoveredGroup(null);
                                            setHoveredSchool(null);
                                            setTooltipInfo(null);
                                        } else if (seat.status === 'sold') {
                                            const group = seat.groupName || seat.assignedTo || 'Desconocido';
                                            const school = seat.schoolName || 'Sin escuela';
                                            const ticketsCount = seats.filter(s => 
                                                s.status === 'sold' && 
                                                (s.groupName === group || s.assignedTo === group) && 
                                                s.schoolName === school
                                            ).length;

                                            setHoveredGroup(group);
                                            setHoveredSchool(school);
                                            if (e) {
                                                setTooltipInfo({ 
                                                    x: e.clientX, 
                                                    y: e.clientY, 
                                                    groupName: group, 
                                                    schoolName: school, 
                                                    tickets: ticketsCount 
                                                });
                                            }
                                        }
                                    }}
                                    readonly={readonly}
                                />
                            );
                        })}

                    {/* Legend */}
                    <div className="mt-12 border-t pt-4 flex items-center justify-center gap-2">
                        <div className="w-6 h-6 bg-pink-100 border-2 border-pink-500 rounded-md shrink-0"></div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Plazas reservadas PMR</span>
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
                <button onClick={() => setScale(0.8)} className="p-2 hover:bg-slate-100 rounded-md transition-colors border-t border-slate-100 mt-1" title="Restablecer Zoom">
                    <RotateCcw size={16} className="text-slate-500" />
                </button>
            </div>
        </div>
    );
}

// Sub-component for rendering a single row with gaps
function RowRenderer({ rowNum, displayRowNum, seats, gaps, isSelected, getHighlightLevel, onSeatToggle, onSeatHover, readonly }: any) {
    const rLabel = displayRowNum || rowNum;

    return (
        <div className="flex items-center justify-center gap-1">
            {/* Row Num Left */}
            <div className="w-8 text-right pr-3 font-bold text-gray-400 text-xs shrink-0 select-none">{rLabel}</div>

            {/* Seats */}
            {seats.map((seat: Seat) => (
                <div key={seat.id} className="flex gap-0.5">
                    <SeatButton
                        seat={seat}
                        selected={isSelected(seat)}
                        highlightLevel={getHighlightLevel(seat)}
                        onSeatToggle={onSeatToggle}
                        onSeatHover={onSeatHover}
                        readonly={readonly}
                    />
                    {/* Gap if needed */}
                    {gaps.includes(seat.number) && <div className="w-8 shrink-0"></div>}
                </div>
            ))}

            {/* Row Num Right */}
            <div className="w-8 text-left pl-3 font-bold text-gray-400 text-xs shrink-0 select-none">{rLabel}</div>
        </div>
    )
}


function settingsForSeat(seat: Seat, selected: boolean, highlightLevel: 'none' | 'group' | 'school') {
    if (seat.status === 'sold') {
        if (highlightLevel === 'group') {
            return "bg-yellow-400 border-2 border-yellow-600 text-yellow-900 font-bold shadow-lg ring-4 ring-yellow-200 scale-110 z-30";
        }
        if (highlightLevel === 'school') {
            return "bg-cyan-400 border-2 border-cyan-600 text-cyan-900 font-bold shadow-md ring-4 ring-cyan-100 scale-105 z-20";
        }
        return STATUS_STYLES.sold;
    }
    if (seat.status === 'reserved') return STATUS_STYLES.reserved;
    if (seat.status === 'blocked') return STATUS_STYLES.blocked;

    if (selected) return "bg-gray-900 text-white border-2 border-gray-900 shadow-md scale-110 z-20";

    return ZONE_STYLES[seat.zone];
}

function SeatButton({
    seat,
    selected,
    highlightLevel = 'none',
    onSeatToggle,
    onSeatHover,
    readonly
}: {
    seat: Seat,
    selected: boolean,
    highlightLevel?: 'none' | 'group' | 'school',
    onSeatToggle?: (s: Seat, e: React.MouseEvent) => void,
    onSeatHover?: (seat: Seat | null, e?: React.MouseEvent) => void,
    readonly: boolean
}) {
    const isSold = seat.status === 'sold';

    // Allow clicking if available OR reserved (to unassign)
    const isDisabled = (seat.status !== 'available' && seat.status !== 'reserved') || readonly;

    return (
        <button
            onClick={(e) => {
                if (isDisabled) return;
                !readonly && onSeatToggle && onSeatToggle(seat, e);
            }}
            onMouseEnter={(e) => onSeatHover && onSeatHover(seat, e)}
            onMouseLeave={() => onSeatHover && onSeatHover(null)}
            title={`${seat.zone} - Fila ${seat.row} | Asiento ${seat.number}${seat.assignedTo ? `\nAsignado a: ${seat.assignedTo}` : ''}${seat.status === 'blocked' ? '\nBLOQUEADO (Organización)' : ''}`}
            className={cn(
                "w-6 h-6 flex items-center justify-center text-[9px] font-bold transition-all duration-200 rounded-[2px] shrink-0 select-none",
                settingsForSeat(seat, selected, highlightLevel)
            )}
        >
            {isSold ? <User size={10} className="opacity-0" /> : selected ? <Check size={12} strokeWidth={4} /> : seat.number}
        </button>
    )
}
