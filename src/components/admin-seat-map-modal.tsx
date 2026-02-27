"use client";

import { useState } from "react";
import { Seat } from "@/types";
import { SeatMap } from "@/components/seat-map";
import { X, Map as MapIcon, Lock, Unlock, UserPlus } from "lucide-react";
import { blockSeatAction, unblockSeatAction } from "@/app/actions-seats";
import { ManualAssignModal } from "@/components/manual-assign-modal";

interface AdminSeatMapModalProps {
    sessionId: string;
    sessionName: string;
    seats: Seat[];
    stats: {
        sold: number;
        blocked: number;
        occupied: number;
        available: number;
        total: number;
        revenue: number;
    };
}

export function AdminSeatMapModal({ sessionId, sessionName, seats, stats }: AdminSeatMapModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState<{ sessionId: string; seatId: string; seatLabel: string } | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const handleSeatClick = async (seat: Seat, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (seat.status === 'blocked') {
            // Show options: Unblock or Assign Manually
            const action = confirm(`Butaca ${seat.id} está bloqueada.\n\n¿Qué deseas hacer?\n\nOK = Asignar Manualmente\nCancelar = Desbloquear`);

            if (action) {
                // Assign manually
                setSelectedSeat({
                    sessionId,
                    seatId: seat.id,
                    seatLabel: seat.id
                });
                setShowAssignModal(true);
            } else {
                // Unblock
                setProcessing(true);
                const result = await unblockSeatAction(sessionId, seat.id);
                setProcessing(false);

                if (result.success) {
                    window.location.reload(); // Refresh to show updated state
                } else {
                    alert("Error al desbloquear: " + result.error);
                }
            }
        } else if (seat.status === 'available') {
            // Block seat
            const confirm_block = confirm(`¿Bloquear butaca ${seat.id}?`);
            if (!confirm_block) return;

            setProcessing(true);
            const result = await blockSeatAction(sessionId, seat.id);
            setProcessing(false);

            if (result.success) {
                window.location.reload(); // Refresh to show updated state
            } else {
                alert("Error al bloquear: " + result.error);
            }
        } else if (seat.status === 'sold' && !(seat as any).registration_id) {
            // Manually assigned seat - show info
            alert(`Butaca asignada manualmente:\n\nAsignado a: ${(seat as any).assigned_to || 'N/A'}\nPrecio: ${(seat as any).is_free ? 'GRATIS' : '3€'}`);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
                <MapIcon size={16} />
                Ver Mapa / Gestionar Butacas
            </button>
        );
    }

    const blockedCount = seats.filter(s => s.status === 'blocked').length;
    const manuallyAssignedCount = seats.filter(s => s.status === 'sold' && !(s as any).registration_id).length;

    return (
        <>
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
                                Ocupadas: <span className="font-bold text-slate-900">{stats.occupied}</span>
                                <span className="text-xs text-slate-400"> (Vendidas: {stats.sold}, Bloqueadas: {stats.blocked})</span>
                                <span className="mx-2">•</span>
                                Disponibles: <span className="font-bold text-indigo-600">{stats.available}</span> / {stats.total}
                                <span className="mx-2">•</span>
                                Recaudación: <span className="font-bold text-green-600">{stats.revenue}€</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                <Lock size={12} className="inline mr-1" />
                                Botón Editar: {blockedCount} bloqueadas en la vista actual
                                <span className="mx-2">•</span>
                                <UserPlus size={12} className="inline mr-1" />
                                Asignadas Manualmente: {manuallyAssignedCount}
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

                    {/* Instructions */}
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-900 shrink-0">
                        <strong>Instrucciones:</strong> Click en butaca disponible para bloquear | Click en bloqueada para asignar o desbloquear | Click en asignada manualmente para ver info
                    </div>

                    {/* Map Body */}
                    <div className="flex-1 bg-slate-100 overflow-hidden relative z-0">
                        <SeatMap
                            seats={seats}
                            readonly={false}
                            onSeatToggle={handleSeatClick}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0 relative z-20">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/admin/manual-assign/${sessionId}`;
                            }}
                            className="bg-[var(--primary)] hover:bg-pink-600 text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                        >
                            <Lock size={18} />
                            Gestionar Butacas
                        </button>
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

            {/* Manual Assignment Modal */}
            <ManualAssignModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                seatInfo={selectedSeat}
                onSuccess={() => {
                    window.location.reload(); // Refresh to show updated state
                }}
            />
        </>
    );
}
