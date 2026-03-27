"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, UserPlus, X } from "lucide-react";
import { blockSeatAction, unblockSeatAction } from "@/app/actions-seats";
import { ManualAssignModal } from "./manual-assign-modal";
import { Seat } from "@/types";

interface SeatManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    sessionName: string;
    seats: Seat[];
    onUpdate: () => void;
}

export function SeatManagementModal({
    isOpen,
    onClose,
    sessionId,
    sessionName,
    seats,
    onUpdate
}: SeatManagementModalProps) {
    const [selectedSeat, setSelectedSeat] = useState<{ sessionId: string; seatId: string; seatLabel: string } | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const handleSeatClick = async (seat: Seat) => {
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
                    onUpdate();
                } else {
                    alert("Error al desbloquear: " + result.error);
                }
            }
        } else if (seat.status === 'available') {
            // Block seat
            setProcessing(true);
            const result = await blockSeatAction(sessionId, seat.id);
            setProcessing(false);

            if (result.success) {
                onUpdate();
            } else {
                alert("Error al bloquear: " + result.error);
            }
        } else if (seat.status === 'sold' && !seat.registration_id) {
            // Manually assigned seat - show info
            alert(`Butaca asignada manualmente:\n\nAsignado a: ${seat.assignedTo || 'N/A'}\nPrecio: ${seat.is_free ? 'GRATIS' : '3€'}`);
        }
    };

    const getSeatStyle = (seat: Seat) => {
        if (seat.status === 'blocked') {
            return 'bg-red-500 border-red-700 text-white hover:bg-red-600';
        } else if (seat.status === 'sold' && !seat.registration_id) {
            return 'bg-purple-500 border-purple-700 text-white'; // Manually assigned
        } else if (seat.status === 'sold') {
            return 'bg-gray-400 border-gray-500 text-gray-700'; // Regular sold
        } else {
            return 'bg-white border-gray-300 text-gray-900 hover:bg-green-50'; // Available
        }
    };

    const getSeatIcon = (seat: Seat) => {
        if (seat.status === 'blocked') {
            return <Lock size={12} />;
        } else if (seat.status === 'sold' && !seat.registration_id) {
            return <UserPlus size={12} />;
        }
        return null;
    };

    // Group seats by zone
    const seatsByZone = seats.reduce((acc, seat) => {
        if (!acc[seat.zone]) acc[seat.zone] = [];
        acc[seat.zone].push(seat);
        return acc;
    }, {} as Record<string, Seat[]>);

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-neutral-900 rounded-2xl border border-white/10 max-w-6xl w-full p-6 shadow-2xl my-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Lock size={24} className="text-[var(--primary)]" />
                                Gestionar Butacas - {sessionName}
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Click en butaca disponible para bloquear | Click en bloqueada para asignar o desbloquear
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
                            <span className="text-sm text-gray-300">Disponible</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-500 border-2 border-red-700 rounded flex items-center justify-center">
                                <Lock size={12} className="text-white" />
                            </div>
                            <span className="text-sm text-gray-300">Bloqueada</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-500 border-2 border-purple-700 rounded flex items-center justify-center">
                                <UserPlus size={12} className="text-white" />
                            </div>
                            <span className="text-sm text-gray-300">Asignada Manualmente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-400 border-2 border-gray-500 rounded"></div>
                            <span className="text-sm text-gray-300">Vendida (Inscripción)</span>
                        </div>
                    </div>

                    {/* Seats Grid by Zone */}
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                        {Object.entries(seatsByZone).map(([zone, zoneSeats]) => (
                            <div key={zone} className="bg-black/20 rounded-lg p-4 border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-3">{zone}</h3>
                                <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-2">
                                    {zoneSeats.map((seat) => (
                                        <button
                                            key={seat.id}
                                            onClick={() => handleSeatClick(seat)}
                                            disabled={processing || (seat.status === 'sold' && seat.registration_id !== null)}
                                            title={`${seat.id}\n${seat.status === 'blocked' ? 'BLOQUEADA' : seat.status === 'sold' && !seat.registration_id ? `Asignado a: ${seat.assignedTo}` : seat.status}`}
                                            className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all duration-200 rounded border-2 ${getSeatStyle(seat)} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {getSeatIcon(seat) || seat.number}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Close Button */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg transition-colors"
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
                    onUpdate();
                }}
            />
        </>
    );
}
