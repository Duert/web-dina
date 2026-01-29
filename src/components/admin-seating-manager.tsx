"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SeatMap } from "@/components/seat-map";
import { initialSeats } from "@/lib/data";
import { Seat, Ticket } from "@/types";
import { Lock, Unlock, RefreshCw, User, Ticket as TicketIcon } from "lucide-react";

export default function AdminSeatingManager() {
    const [session, setSession] = useState<'morning' | 'afternoon'>('morning');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [saving, setSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [session]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch tickets
            const { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select('*')
                .eq('session_id', session);

            if (ticketError) throw ticketError;
            setTickets(ticketData || []);

            // Fetch registrations to map names
            const { data: regData, error: regError } = await supabase
                .from('registrations')
                .select('id, group_name, school_name');

            if (regError) throw regError;
            setRegistrations(regData || []);

        } catch (error) {
            console.error("Error fetching seating data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Computed Seats
    const computedSeats = initialSeats.map(seat => {
        const ticket = tickets.find(t => t.seat_id === seat.id);
        let status: Seat['status'] = 'available';

        let assignedTo = undefined;

        if (ticket) {
            if (ticket.status === 'sold') {
                status = 'sold';
                // Find group name
                const reg = registrations.find(r => r.id === ticket.registration_id);
                if (reg) assignedTo = reg.group_name;
            }
            else if (ticket.status === 'blocked') status = 'blocked';
        }

        return { ...seat, status, assignedTo, _ticket: ticket };
    });

    // Stats
    const stats = {
        total: initialSeats.length,
        sold: tickets.filter(t => t.status === 'sold').length,
        blocked: tickets.filter(t => t.status === 'blocked').length,
        available: initialSeats.length - tickets.filter(t => t.status === 'sold' || t.status === 'blocked').length
    };

    // Handlers
    const handleSeatToggle = (seat: Seat, e: React.MouseEvent) => {
        // Admin Mode: Toggle Selection for Action
        const isSelected = selectedSeats.some(s => s.id === seat.id);
        if (isSelected) {
            setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
        } else {
            setSelectedSeats(prev => [...prev, seat]);
        }
    };

    const handleBlockSelected = async () => {
        if (selectedSeats.length === 0) return;
        if (!confirm(`¿Bloquear ${selectedSeats.length} asientos para la organización?`)) return;

        setSaving(true);
        try {
            const newTickets = selectedSeats.map(seat => ({
                session_id: session,
                seat_id: seat.id,
                status: 'blocked',
                price: 0,
                registration_id: null
            }));

            const { error } = await supabase
                .from('tickets')
                .upsert(newTickets, { onConflict: 'session_id, seat_id' });

            if (error) throw error;

            alert("Asientos bloqueados correctamente.");
            setSelectedSeats([]);
            fetchData();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReleaseSelected = async () => {
        if (selectedSeats.length === 0) return;
        if (!confirm(`¿Liberar ${selectedSeats.length} asientos seleccionados? Se borrará cualquier bloqueo o venta.`)) return;

        setSaving(true);
        try {
            const seatIds = selectedSeats.map(s => s.id);
            const { error } = await supabase
                .from('tickets')
                .delete()
                .eq('session_id', session)
                .in('seat_id', seatIds);

            if (error) throw error;

            alert("Asientos liberados.");
            setSelectedSeats([]);
            fetchData();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-neutral-900/50 p-4 rounded-xl border border-white/5">

                {/* Session Toggle */}
                <div className="flex bg-black rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setSession('morning')}
                        className={`px-6 py-2 rounded text-sm font-bold transition-colors ${session === 'morning' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Sesión MAÑANA
                    </button>
                    <button
                        onClick={() => setSession('afternoon')}
                        className={`px-6 py-2 rounded text-sm font-bold transition-colors ${session === 'afternoon' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Sesión TARDE
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Total Asientos</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg"><TicketIcon className="text-white w-5 h-5" /></div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Disponibles</p>
                        <p className="text-2xl font-bold text-white">{stats.available}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-600"><div className="w-5 h-5" /></div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Vendidos</p>
                        <p className="text-2xl font-bold text-green-400">{stats.sold}</p>
                    </div>
                    <div className="bg-gray-300 p-2 rounded-lg"><User className="text-gray-600 w-5 h-5" /></div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Bloqueados</p>
                        <p className="text-2xl font-bold text-red-400">{stats.blocked}</p>
                    </div>
                    <div className="bg-red-200 p-2 rounded-lg"><Lock className="text-red-600 w-5 h-5" /></div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {selectedSeats.length > 0 && (
                <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-[var(--primary)] text-white px-2 py-1 rounded text-sm font-bold">{selectedSeats.length}</span>
                        <span className="text-[var(--primary)] text-sm font-medium">Asientos seleccionados</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBlockSelected}
                            className="bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Lock size={16} /> Bloquear
                        </button>
                        <button
                            onClick={handleReleaseSelected}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Unlock size={16} /> Liberar
                        </button>
                    </div>
                </div>
            )}

            {/* Map Area */}
            <div className="h-[600px] border border-white/10 rounded-xl overflow-hidden relative">
                <SeatMap
                    seats={computedSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={handleSeatToggle}
                />
            </div>

            <p className="text-center text-gray-500 text-xs">
                Haz clic en los asientos para seleccionarlos. Luego usa la barra de herramientas superior para Bloquear o Liberar.
            </p>
        </div>
    );
}
