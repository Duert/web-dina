"use client";

import { useState } from "react";
import { X, Lock, Unlock } from "lucide-react";
import { manualAssignSeatAction } from "@/app/actions-seats";

interface ManualAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    seatInfo: {
        sessionId: string;
        seatId: string;
        seatLabel: string;
    } | null;
    onSuccess: () => void;
}

export function ManualAssignModal({ isOpen, onClose, seatInfo, onSuccess }: ManualAssignModalProps) {
    const [assignedTo, setAssignedTo] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [saving, setSaving] = useState(false);

    if (!isOpen || !seatInfo) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!assignedTo.trim()) {
            alert("Por favor, indica a quién se asigna la entrada");
            return;
        }

        setSaving(true);
        try {
            const result = await manualAssignSeatAction(
                seatInfo.sessionId,
                seatInfo.seatId,
                assignedTo.trim(),
                isFree
            );

            if (result.success) {
                alert("Entrada asignada correctamente");
                setAssignedTo("");
                setIsFree(false);
                onSuccess();
                onClose();
            } else {
                alert("Error al asignar: " + result.error);
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock size={20} className="text-[var(--primary)]" />
                            Asignar Manualmente
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Butaca: <span className="font-bold text-white">{seatInfo.seatLabel}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Assigned To Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">
                            Asignado a *
                        </label>
                        <input
                            type="text"
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            placeholder="Ej: Organización, Prensa, Jurado..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors"
                            required
                        />
                    </div>

                    {/* Free Checkbox */}
                    <div className="flex items-center gap-3 bg-black/20 rounded-lg p-4 border border-white/5">
                        <input
                            type="checkbox"
                            id="isFree"
                            checked={isFree}
                            onChange={(e) => setIsFree(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-black/40 text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
                        />
                        <label htmlFor="isFree" className="flex-1">
                            <div className="text-sm font-bold text-white">Entrada Gratuita</div>
                            <div className="text-xs text-gray-400">
                                {isFree ? "No se cobrará (0€)" : "Se cobrará 3€"}
                            </div>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-[var(--primary)] hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {saving ? "Guardando..." : "Asignar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
