"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Unlock, UserPlus, Save, X } from "lucide-react";
import { SeatMap } from "@/components/seat-map";
import { Seat } from "@/types";
import { initialSeats } from "@/lib/data";
import { blockSeatAction, unblockSeatAction, manualAssignSeatAction } from "@/app/actions-seats";
import { supabase } from "@/lib/supabase";

const SESSION_NAMES: Record<string, string> = {
    'block1': 'Bloque 1',
    'block2': 'Bloque 2',
    'block3': 'Bloque 3',
    'block4': 'Bloque 4'
};

export default function ManualAssignPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params); const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [computedSeats, setComputedSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [assignedTo, setAssignedTo] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("");
    const [registrations, setRegistrations] = useState<{ id: string, group_name: string, school_name: string }[]>([]);

    const sessionId = resolvedParams.sessionId;
    const sessionName = SESSION_NAMES[sessionId] || sessionId;

    useEffect(() => {
        loadSeats();
        loadRegistrations();
    }, [sessionId]);

    const loadRegistrations = async () => {
        try {
            const { data } = await supabase
                .from('registrations')
                .select('id, group_name, school_name')
                .neq('status', 'draft')
                .order('school_name', { ascending: true })
                .order('group_name', { ascending: true });
            
            if (data) {
                setRegistrations(data);
            }
        } catch (error) {
            console.error('Error loading registrations:', error);
        }
    };

    const loadSeats = async () => {
        setLoading(true);
        try {
            // Use imported supabase directly
            const { data: tickets } = await supabase
                .from('tickets')
                .select('*')
                .eq('session_id', sessionId);

            const ticketMap = new Map(tickets?.map(t => [t.seat_id, t.status]) || []);

            const seats: Seat[] = initialSeats.map(seat => ({
                ...seat,
                status: (ticketMap.get(seat.id) || 'available') as 'available' | 'sold' | 'reserved' | 'blocked'
            }));

            setComputedSeats(seats);
        } catch (error) {
            console.error('Error loading seats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeatToggle = (seat: Seat) => {
        // Only allow selection of available or blocked seats
        if (seat.status !== 'available' && seat.status !== 'blocked') return;

        const isSelected = selectedSeats.some(s => s.id === seat.id);
        if (isSelected) {
            setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
        } else {
            setSelectedSeats(prev => [...prev, seat]);
        }
    };

    const handleBlock = async () => {
        if (selectedSeats.length === 0) {
            alert("Selecciona al menos una butaca");
            return;
        }

        const availableSeats = selectedSeats.filter(s => s.status === 'available');
        if (availableSeats.length === 0) {
            alert("Solo puedes bloquear butacas disponibles");
            return;
        }

        if (!confirm(`¿Bloquear ${availableSeats.length} butaca(s)?`)) return;

        setSaving(true);
        for (const seat of availableSeats) {
            await blockSeatAction(sessionId, seat.id);
        }
        setSaving(false);

        setSelectedSeats([]);
        loadSeats();
    };

    const handleUnblock = async () => {
        if (selectedSeats.length === 0) {
            alert("Selecciona al menos una butaca");
            return;
        }

        const blockedSeats = selectedSeats.filter(s => s.status === 'blocked');
        if (blockedSeats.length === 0) {
            alert("Solo puedes desbloquear butacas bloqueadas");
            return;
        }

        if (!confirm(`¿Desbloquear ${blockedSeats.length} butaca(s)?`)) return;

        setSaving(true);
        for (const seat of blockedSeats) {
            await unblockSeatAction(sessionId, seat.id);
        }
        setSaving(false);

        setSelectedSeats([]);
        loadSeats();
    };

    const handleAssign = async () => {
        if (selectedSeats.length === 0) {
            alert("Selecciona al menos una butaca");
            return;
        }

        if (!assignedTo.trim()) {
            alert("Indica a quién se asignan las entradas");
            return;
        }

        const assignableSeats = selectedSeats.filter(s => s.status === 'available' || s.status === 'blocked');
        if (assignableSeats.length === 0) {
            alert("Solo puedes asignar butacas disponibles o bloqueadas");
            return;
        }

        if (!confirm(`¿Asignar ${assignableSeats.length} butaca(s) a "${assignedTo}"?`)) return;

        setSaving(true);
        for (const seat of assignableSeats) {
            await manualAssignSeatAction(
                sessionId, 
                seat.id, 
                assignedTo.trim(), 
                isFree, 
                selectedRegistrationId || null
            );
        }
        setSaving(false);

        setSelectedSeats([]);
        setAssignedTo("");
        setSelectedRegistrationId("");
        setIsFree(false);
        loadSeats();
        alert(`${assignableSeats.length} butaca(s) asignadas correctamente`);
    };

    const handleClearSelection = () => {
        setSelectedSeats([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando butacas...</p>
                </div>
            </div>
        );
    }

    const availableCount = computedSeats.filter(s => s.status === 'available').length;
    const blockedCount = computedSeats.filter(s => s.status === 'blocked').length;
    const soldCount = computedSeats.filter(s => s.status === 'sold').length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors font-semibold text-slate-700"
                            >
                                <ArrowLeft size={20} />
                                Volver
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Gestión Manual de Butacas</h1>
                                <p className="text-sm text-slate-500">{sessionName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                                <p className="text-slate-500">Disponibles</p>
                                <p className="text-xl font-bold text-green-600">{availableCount}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-500">Bloqueadas</p>
                                <p className="text-xl font-bold text-red-600">{blockedCount}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-500">Vendidas</p>
                                <p className="text-xl font-bold text-slate-600">{soldCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Seat Map */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Mapa de Butacas</h2>
                            <p className="text-sm text-slate-500">
                                Click en las butacas para seleccionar. Seleccionadas: <span className="font-bold text-[var(--primary)]">{selectedSeats.length}</span>
                            </p>
                        </div>
                        <SeatMap
                            seats={computedSeats}
                            selectedSeats={selectedSeats}
                            onSeatToggle={handleSeatToggle}
                            readonly={false}
                        />
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-4">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={handleBlock}
                                    disabled={saving || selectedSeats.length === 0}
                                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Lock size={18} />
                                    Bloquear Seleccionadas
                                </button>
                                <button
                                    onClick={handleUnblock}
                                    disabled={saving || selectedSeats.length === 0}
                                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Unlock size={18} />
                                    Desbloquear Seleccionadas
                                </button>
                                <button
                                    onClick={handleClearSelection}
                                    disabled={selectedSeats.length === 0}
                                    className="w-full bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={18} />
                                    Limpiar Selección
                                </button>
                            </div>
                        </div>

                        {/* Assignment Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <UserPlus size={20} className="text-[var(--primary)]" />
                                Asignar Manualmente
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Vincular a Grupo/Escuela (Opcional)
                                    </label>
                                    <select
                                        value={selectedRegistrationId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedRegistrationId(val);
                                            if (val) {
                                                const reg = registrations.find(r => r.id === val);
                                                if (reg) {
                                                    setAssignedTo(`${reg.school_name || 'Sin Escuela'} - ${reg.group_name}`);
                                                }
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-[var(--primary)] transition-colors mb-4"
                                    >
                                        <option value="">-- No vincular a un grupo específico --</option>
                                        {registrations.map(reg => (
                                            <option key={reg.id} value={reg.id}>
                                                {reg.school_name || 'Sin Escuela'} - {reg.group_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Asignado a *
                                    </label>
                                    <input
                                        type="text"
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        placeholder="Ej: Organización, Prensa, Jurado..."
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="isFree"
                                        checked={isFree}
                                        onChange={(e) => setIsFree(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <label htmlFor="isFree" className="flex-1">
                                        <div className="text-sm font-bold text-slate-900">Entrada Gratuita</div>
                                        <div className="text-xs text-slate-500">
                                            {isFree ? "No se cobrará (0€)" : "Se cobrará 3€ por entrada"}
                                        </div>
                                    </label>
                                </div>

                                <button
                                    onClick={handleAssign}
                                    disabled={saving || selectedSeats.length === 0 || !assignedTo.trim()}
                                    className="w-full bg-[var(--primary)] hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    {saving ? "Guardando..." : `Asignar ${selectedSeats.length} Butaca(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
