"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SeatMap } from "@/components/seat-map";
import { initialSeats } from "@/lib/data";
import { Seat, Ticket } from "@/types";
import { ArrowLeft, Save, Lock, AlertCircle } from "lucide-react";

// Zone Pricing Map (manual for now, matching main app)
const ZONE_PRICES = {
    'Preferente': 12,
    'Zona 2': 10,
    'Zona 3': 8,
    'PMR': 12
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
    const [session, setSession] = useState<'morning' | 'afternoon'>('morning');
    const [existingTickets, setExistingTickets] = useState<Ticket[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

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
                .select('*, registration_participants(count)')
                .eq('id', registrationId)
                .single();

            if (error) throw error;
            setRegistration(data);

            // Heuristic to guess session (optional, defaults to morning)
            if (data.category && ['Juvenil', 'Absoluta', 'Premium', 'Parejas'].includes(data.category)) {
                setSession('afternoon');
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

    const handleSeatToggle = (seat: Seat, e: React.MouseEvent) => {
        // If seat is 'reserved' (already owned by this group), maybe allow unselecting?
        // For now, let's focus on ASSIGNING available seats.

        // Shift Click Range Selection
        if (e.shiftKey && lastSelectedSeat) {
            const startIdx = initialSeats.findIndex(s => s.id === lastSelectedSeat.id);
            const endIdx = initialSeats.findIndex(s => s.id === seat.id);

            if (startIdx !== -1 && endIdx !== -1) {
                const low = Math.min(startIdx, endIdx);
                const high = Math.max(startIdx, endIdx);
                const range = initialSeats.slice(low, high + 1);

                // Add all available seats in range to selection (avoid duplicates)
                const newSelection = [...selectedSeats];
                range.forEach(s => {
                    // Only select if available and not already selected
                    const isAvailable = computedSeats.find(cs => cs.id === s.id)?.status === 'available';
                    if (isAvailable && !newSelection.some(sel => sel.id === s.id)) {
                        newSelection.push(s);
                    }
                });
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
            // Check capacity limits? Nah, let admin decide.
            setSelectedSeats(prev => [...prev, seat]);
            setLastSelectedSeat(seat);
        }
    };

    // 6. Save Logic
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

            alert("Asientos asignados correctamente");
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
    const requestedCount = registration.registration_participants?.[0]?.count || 0;

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
                            onClick={() => setSession('morning')}
                            className={`px-4 py-1 rounded text-sm font-bold transition-colors ${session === 'morning' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            MAÑANA
                        </button>
                        <button
                            onClick={() => setSession('afternoon')}
                            className={`px-4 py-1 rounded text-sm font-bold transition-colors ${session === 'afternoon' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            TARDE
                        </button>
                    </div>

                    <div className="text-right hidden md:block">
                        <p className="text-gray-400 text-xs uppercase">Asignados</p>
                        <p className="text-white font-bold text-xl">{assignedCount} <span className="text-sm font-normal text-gray-500">/ {requestedCount}</span></p>
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
