"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SeatMap } from "@/components/seat-map";
import { initialSeats } from "@/lib/data";
import { Seat, Ticket } from "@/types";
import { ArrowLeft, Save, Lock, AlertCircle, Check, X } from "lucide-react";
import { unassignSeatAction } from "@/app/actions-seats";

// Zone Pricing Map (manual for now, matching main app)
const ZONE_PRICES = {
    'Preferente': 12,
    'Zona 2': 10,
    'Zona 3': 8,
    'PMR': 12
};

// Block Definitions (matching admin panel)
const BLOCK_DEFINITIONS: Record<string, string[]> = {
    'Bloque 1 (Mañana 1)': ['Infantil', 'Infantil Mini-parejas', 'Mini-Solistas Infantil'],
    'Bloque 2 (Mañana 2)': ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior'],
    'Bloque 3 (Tarde 1)': ['Juvenil', 'Juvenil Parejas', 'Solistas Juvenil'],
    'Bloque 4 (Tarde 2)': ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium'],
};

// Helper to get block from category
const getBlockFromCategory = (category: string): 'block1' | 'block2' | 'block3' | 'block4' => {
    if (BLOCK_DEFINITIONS['Bloque 1 (Mañana 1)'].includes(category)) return 'block1';
    if (BLOCK_DEFINITIONS['Bloque 2 (Mañana 2)'].includes(category)) return 'block2';
    if (BLOCK_DEFINITIONS['Bloque 3 (Tarde 1)'].includes(category)) return 'block3';
    if (BLOCK_DEFINITIONS['Bloque 4 (Tarde 2)'].includes(category)) return 'block4';
    return 'block1'; // default
};

export default function AssignSeatsPage({ params }: { params: Promise<{ registrationId: string }> }) {
    const router = useRouter();
    // Unwrap params
    const resolvedParams = use(params);
    const { registrationId } = resolvedParams;

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");

    // Data State
    const [registration, setRegistration] = useState<any>(null);
    const [session, setSession] = useState<'block1' | 'block2' | 'block3' | 'block4'>('block1');
    const [existingTickets, setExistingTickets] = useState<Ticket[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quickSelectCount, setQuickSelectCount] = useState<string>("");

    // 1. Auth Check (Simple PIN)
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "2026") {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert("PIN Incorrecto");
        }
    };

    // 2. Fetch Registration Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*, registration_participants(num_tickets)')
                .eq('id', registrationId)
                .single();

            if (error) throw error;
            setRegistration(data);

            // Auto-detect block from category
            if (data.category) {
                setSession(getBlockFromCategory(data.category));
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Fetch Tickets for Session
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchTickets = async () => {
            const { data } = await supabase
                .from('tickets')
                .select('*')
                .eq('session_id', session);

            if (data) setExistingTickets(data);
        };

        fetchTickets();
        // Clear selection on session change to avoid errors
        setSelectedSeats([]);
    }, [isAuthenticated, session]);


    // 4. Compute Seat Status
    const computedSeats = initialSeats.map(seat => {
        const ticket = existingTickets.find(t => t.seat_id === seat.id);

        let status: Seat['status'] = 'available';
        if (ticket) {
            if (ticket.status === 'sold') status = 'sold';
            if (ticket.status === 'blocked') status = 'blocked';
            // If THIS group owns the ticket, maybe show differently? 
            if (ticket.registration_id === registrationId) status = 'reserved'; // Reuse 'reserved' as 'owned by this group'
        }

        return { ...seat, status };
    });

    // 5. Toggle Logic
    const [lastSelectedSeat, setLastSelectedSeat] = useState<Seat | null>(null);

    const handleSeatToggle = async (seat: Seat, e: React.MouseEvent) => {
        // Calculate counts dynamically inside handler to ensure freshness, 
        // OR better: rely on state. But current assignedCount definition is outside.
        // Let's redefine requestedCount here:
        const requestedCount = registration?.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;

        // 1. Unassign Logic (If seat is owned by this group)
        if (seat.status === 'reserved') {
            if (confirm(`¿Desasignar asiento ${seat.id}?`)) {
                setLoading(true); // temporary loading state
                const res = await unassignSeatAction(session, seat.id);
                if (!res.success) {
                    alert("Error al desasignar: " + res.error);
                }
                // Refresh
                const { data } = await supabase.from('tickets').select('*').eq('session_id', session);
                if (data) setExistingTickets(data);
                setLoading(false);
            }
            return;
        }

        // Shift Click Range Selection
        if (e.shiftKey && lastSelectedSeat) {
            const startIdx = initialSeats.findIndex(s => s.id === lastSelectedSeat.id);
            const endIdx = initialSeats.findIndex(s => s.id === seat.id);

            if (startIdx !== -1 && endIdx !== -1) {
                const low = Math.min(startIdx, endIdx);
                const high = Math.max(startIdx, endIdx);
                const range = initialSeats.slice(low, high + 1);

                // Check remaining capacity (Strict Limit)
                const remaining = requestedCount - assignedCount - selectedSeats.length;
                if (remaining <= 0) {
                    alert(`Límite de ${requestedCount} butacas alcanzado. No puedes seleccionar más.`);
                    return;
                }

                // Add available seats in range
                const newSelection = [...selectedSeats];
                let addedCount = 0;

                range.forEach(s => {
                    if (addedCount >= remaining) return; // Stop if limit reached in range

                    const isAvailable = computedSeats.find(cs => cs.id === s.id)?.status === 'available';
                    // Only add if not already selected
                    if (isAvailable && !newSelection.some(sel => sel.id === s.id)) {
                        newSelection.push(s);
                        addedCount++;
                    }
                });

                if (addedCount > 0 && addedCount < range.filter(s => computedSeats.find(cs => cs.id === s.id)?.status === 'available').length) {
                    // If we stopped early due to limit
                    alert(`Se han seleccionado solo ${addedCount} butacas para no exceder el límite de ${requestedCount}.`);
                } else if (addedCount === 0 && range.some(s => computedSeats.find(cs => cs.id === s.id)?.status === 'available')) {
                    alert(`Límite de ${requestedCount} butacas alcanzado.`);
                }

                setSelectedSeats(newSelection);
                return;
            }
        }

        // Standard Toggle
        const isSelected = selectedSeats.some(s => s.id === seat.id);

        if (isSelected) {
            setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
            setLastSelectedSeat(null);
        } else {
            // Check capacity limits (Strict)
            if (assignedCount + selectedSeats.length >= requestedCount) {
                alert(`Límite de ${requestedCount} butacas alcanzado. No puedes asignar más.`);
                return;
            }

            setSelectedSeats(prev => [...prev, seat]);
            setLastSelectedSeat(seat);
        }
    };

    // 6. Auto-Fill Logic
    const handleAutoFill = () => {
        const requestedCount = registration?.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;
        const assignedCount = existingTickets.filter(t => t.registration_id === registrationId).length;
        const remaining = requestedCount - assignedCount - selectedSeats.length;

        if (remaining <= 0) {
            alert("Ya tienes todas las butacas necesarias asignadas o seleccionadas.");
            return;
        }

        const availableSeats = computedSeats.filter(s => s.status === 'available' && !selectedSeats.some(sel => sel.id === s.id));
        const toSelect = availableSeats.slice(0, remaining);

        if (toSelect.length < remaining) {
            const blockedCount = computedSeats.filter(s => s.status === 'blocked').length;
            const message = blockedCount > 0
                ? `Solo hay ${toSelect.length} butacas disponibles de las ${remaining} que necesitas (${blockedCount} bloqueadas). ¿Seleccionar las disponibles?`
                : `Solo hay ${toSelect.length} butacas disponibles de las ${remaining} que necesitas. ¿Seleccionar las disponibles?`;
            if (!confirm(message)) {
                return;
            }
        }

        setSelectedSeats(prev => [...prev, ...toSelect]);
    };

    // 7. Quick Select by Number
    const handleQuickSelect = () => {
        const count = parseInt(quickSelectCount);
        if (isNaN(count) || count <= 0) {
            alert("Introduce un número válido");
            return;
        }

        const requestedCount = registration?.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;
        const assignedCount = existingTickets.filter(t => t.registration_id === registrationId).length;
        const maxAllowed = requestedCount - assignedCount - selectedSeats.length;

        if (count > maxAllowed) {
            alert(`Solo puedes seleccionar ${maxAllowed} butacas más.`);
            return;
        }

        const availableSeats = computedSeats.filter(s => s.status === 'available' && !selectedSeats.some(sel => sel.id === s.id));
        const toSelect = availableSeats.slice(0, count);

        if (toSelect.length < count) {
            alert(`Solo hay ${toSelect.length} butacas disponibles (sin contar bloqueadas).`);
        }

        setSelectedSeats(prev => [...prev, ...toSelect]);
        setQuickSelectCount("");
    };

    // 8. Select by Zone
    const handleSelectZone = (zone: string) => {
        const requestedCount = registration?.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;
        const assignedCount = existingTickets.filter(t => t.registration_id === registrationId).length;
        const maxAllowed = requestedCount - assignedCount - selectedSeats.length;

        if (maxAllowed <= 0) {
            alert("Ya tienes todas las butacas necesarias.");
            return;
        }

        const zoneSeats = computedSeats.filter(s => s.status === 'available' && s.zone === zone && !selectedSeats.some(sel => sel.id === s.id));
        const toSelect = zoneSeats.slice(0, maxAllowed);

        if (toSelect.length === 0) {
            alert(`No hay butacas disponibles en ${zone}`);
            return;
        }

        setSelectedSeats(prev => [...prev, ...toSelect]);
    };

    // 9. Deselect All
    const handleDeselectAll = () => {
        setSelectedSeats([]);
    };

    // 10. Save Logic
    const handleSave = async () => {
        if (selectedSeats.length === 0) return;
        setSaving(true);
        try {
            const newTickets = selectedSeats.map(seat => ({
                session_id: session,
                seat_id: seat.id,
                status: 'sold', // Mark as Sold/Occupied
                price: ZONE_PRICES[seat.zone] || 0,
                registration_id: registrationId
            }));

            const { error } = await supabase
                .from('tickets')
                .upsert(newTickets, { onConflict: 'session_id, seat_id' });

            if (error) throw error;

            alert("Entradas asignadas correctamente");
            setSelectedSeats([]);
            // Refresh tickets
            const { data } = await supabase.from('tickets').select('*').eq('session_id', session);
            if (data) setExistingTickets(data);

        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // 11. Keyboard Shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input
            if (e.target instanceof HTMLInputElement) return;

            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                handleAutoFill();
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                handleDeselectAll();
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedSeats, registration, existingTickets]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-neutral-900 p-8 rounded-xl border border-white/10 text-center space-y-4">
                    <Lock className="w-8 h-8 text-[var(--primary)] mx-auto" />
                    <h2 className="text-white font-bold">Seguridad Admin</h2>
                    <input
                        type="password"
                        value={pin} onChange={e => setPin(e.target.value)}
                        placeholder="PIN"
                        className="w-full bg-black border border-white/20 rounded p-2 text-center text-white"
                    />
                    <button type="submit" className="w-full bg-[var(--primary)] text-white font-bold py-2 rounded">Entrar</button>
                </form>
            </div>
        );
    }

    if (loading || !registration) return <div className="min-h-screen bg-black text-white p-8">Cargando...</div>;

    const assignedCount = existingTickets.filter(t => t.registration_id === registrationId).length;
    // Recalculate for display
    const requestedCount = registration.registration_participants?.reduce((sum: number, p: any) => sum + (p.num_tickets || 0), 0) || 0;

    return (
        <div className="flex flex-col h-screen bg-neutral-950">
            {/* Header */}
            <header className="bg-neutral-900 border-b border-white/10 p-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-white hover:text-gray-300">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-white font-bold text-lg">{registration.group_name}</h1>
                        <p className="text-gray-400 text-xs">{registration.category} • Solicitados: {requestedCount}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Session Toggle */}
                    <div className="flex bg-black rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setSession('block1')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${session === 'block1' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            BLOQUE 1
                        </button>
                        <button
                            onClick={() => setSession('block2')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${session === 'block2' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            BLOQUE 2
                        </button>
                        <button
                            onClick={() => setSession('block3')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${session === 'block3' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            BLOQUE 3
                        </button>
                        <button
                            onClick={() => setSession('block4')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${session === 'block4' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            BLOQUE 4
                        </button>
                    </div>

                    <div className="text-right hidden md:block">
                        <p className="text-gray-400 text-xs uppercase">Asignados</p>
                        <p className="text-white font-bold text-xl">{assignedCount} <span className="text-sm font-normal text-gray-500">/ {requestedCount}</span></p>
                        {selectedSeats.length > 0 && (
                            <p className="text-[var(--primary)] text-xs font-bold">+{selectedSeats.length} seleccionadas</p>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={selectedSeats.length === 0 || saving}
                        className="bg-[var(--primary)] disabled:opacity-50 hover:bg-pink-600 text-white font-bold px-6 py-2 rounded-full flex items-center gap-2 transition-all shadow-lg shadow-pink-500/20"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : `Confirmar (${selectedSeats.length})`}
                    </button>
                </div>
            </header>

            {/* Bulk Assignment Toolbar */}
            <div className="bg-neutral-900/50 border-b border-white/10 p-3 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Auto-Fill Button */}
                    <button
                        onClick={handleAutoFill}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm"
                    >
                        <Check size={16} /> Auto-Asignar Restantes
                    </button>

                    {/* Quick Select Input */}
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1.5 border border-white/10">
                        <input
                            type="number"
                            value={quickSelectCount}
                            onChange={(e) => setQuickSelectCount(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickSelect()}
                            placeholder="Cantidad"
                            className="bg-transparent text-white w-20 text-sm outline-none"
                        />
                        <button
                            onClick={handleQuickSelect}
                            disabled={!quickSelectCount}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-3 py-1 rounded text-xs transition-all"
                        >
                            Seleccionar
                        </button>
                    </div>

                    {/* Zone Selection Buttons */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-bold">Por zona:</span>
                        <button
                            onClick={() => handleSelectZone('Preferente')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded text-xs transition-all"
                        >
                            Preferente
                        </button>
                        <button
                            onClick={() => handleSelectZone('Zona 2')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded text-xs transition-all"
                        >
                            Zona 2
                        </button>
                        <button
                            onClick={() => handleSelectZone('Zona 3')}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded text-xs transition-all"
                        >
                            Zona 3
                        </button>
                    </div>

                    {/* Deselect All */}
                    {selectedSeats.length > 0 && (
                        <button
                            onClick={handleDeselectAll}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm ml-auto"
                        >
                            <X size={16} /> Deseleccionar Todo
                        </button>
                    )}
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                    <span><kbd className="bg-black/40 px-1.5 py-0.5 rounded border border-white/10">A</kbd> Auto-asignar</span>
                    <span><kbd className="bg-black/40 px-1.5 py-0.5 rounded border border-white/10">D</kbd> Deseleccionar</span>
                    <span><kbd className="bg-black/40 px-1.5 py-0.5 rounded border border-white/10">S</kbd> Guardar</span>
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* Legend Overlay */}
                <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur p-4 rounded-xl border border-white/10 text-white text-xs space-y-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-indigo-600"></div> Disponible</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-200 border border-yellow-400"></div> Asignado a este grupo</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-300 border border-gray-400"></div> Ocupado (Otros)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-neutral-900 border border-white"></div> Selección Actual</div>
                </div>

                <SeatMap
                    seats={computedSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={handleSeatToggle}
                />
            </div>
        </div>
    );
}
