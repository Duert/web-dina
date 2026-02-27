"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SeatMap } from "@/components/seat-map";
import { initialSeats } from "@/lib/data";
import { Seat, Ticket } from "@/types";
import { Lock, Unlock, RefreshCw, User, Ticket as TicketIcon, UserPlus, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminSeatingManager() {
    const [session, setSession] = useState<'block1' | 'block2' | 'block3' | 'block4'>('block1');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
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
    }, [session]);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                // If no registration, it's a manual assignment, use assigned_to from ticket
                else if (ticket.assigned_to) assignedTo = ticket.assigned_to;
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
        occupied: tickets.filter(t => t.status === 'sold' || t.status === 'blocked').length,
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

            alert("Entradas bloqueadas correctamente.");
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

            alert("Entradas liberadas.");
            setSelectedSeats([]);
            fetchData();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReleaseGroup = async (registrationId: string | null, assignedTo: string | undefined) => {
        const groupLabel = assignedTo || `Registro ${registrationId}`;
        if (!confirm(`¿Liberar TODAS las butacas de "${groupLabel}" en este bloque?`)) return;

        setSaving(true);
        try {
            let query = supabase.from('tickets').delete().eq('session_id', session);

            if (registrationId) {
                query = query.eq('registration_id', registrationId);
            } else if (assignedTo) {
                // Manual assignments don't have registration_id but are marked as sold
                // In this schema, we'd need to identify them by seat_id if registration_id is null
                const groupTickets = tickets.filter(t => t.registration_id === null && t.status === 'sold');
                // This might be tricky if multiple manual assignments exist. 
                // However, the current logic uses assignedTo from the ticket's registration link.
                // If it's manual, registration_id is null.
                query = query.eq('registration_id', null);
                // Warning: This would release ALL manual assignments. 
                // To be safe, let's filter by the specific seat IDs of this group
                const seatIds = tickets
                    .filter(t => t.registration_id === registrationId && (registrationId !== null || t.status === 'sold'))
                    .map(t => t.seat_id);
                // Re-fetch more specific seat IDs for this group
                const groupSeatIds = computedSeats
                    .filter(s => (registrationId && s._ticket?.registration_id === registrationId) || (!registrationId && s.assignedTo === assignedTo))
                    .map(s => s.id);

                query = supabase.from('tickets').delete().eq('session_id', session).in('seat_id', groupSeatIds);
            } else {
                return;
            }

            const { error } = await query;
            if (error) throw error;

            alert("Butacas liberadas correctamente.");
            fetchData();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    // Grouping logic for the table
    const groupAssignments = () => {
        const groups: Record<string, {
            registration_id: string | null,
            assignedTo: string,
            school: string,
            seats: Record<string, number[]>, // Key: "Zone-Row", Value: Array of seat numbers
            total: number
        }> = {};

        computedSeats.forEach(seat => {
            if (seat.status === 'sold') {
                const key = seat._ticket?.registration_id || seat.assignedTo || 'manual';
                if (!groups[key]) {
                    const reg = registrations.find(r => r.id === seat._ticket?.registration_id);
                    groups[key] = {
                        registration_id: seat._ticket?.registration_id || null,
                        assignedTo: seat.assignedTo || 'Manual',
                        school: reg?.school_name || '-',
                        seats: {},
                        total: 0
                    };
                }

                const zonePrefix = seat.zone.startsWith('Patio') ? 'P' : 'A';
                const rowKey = `${zonePrefix}-Fila ${seat.row}`;

                if (!groups[key].seats[rowKey]) {
                    groups[key].seats[rowKey] = [];
                }
                groups[key].seats[rowKey].push(seat.number);
                groups[key].total++;
            }
        });

        // Format seats into readable ranges
        const result = Object.values(groups).map(group => {
            const formattedSeats: string[] = [];

            Object.keys(group.seats).sort().forEach(rowKey => {
                const numbers = group.seats[rowKey].sort((a, b) => a - b);
                const ranges: string[] = [];
                if (numbers.length > 0) {
                    let start = numbers[0];
                    let prev = numbers[0];

                    for (let i = 1; i <= numbers.length; i++) {
                        if (i < numbers.length && numbers[i] === prev + 1) {
                            prev = numbers[i];
                        } else {
                            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                            if (i < numbers.length) {
                                start = numbers[i];
                                prev = numbers[i];
                            }
                        }
                    }
                }
                formattedSeats.push(`${rowKey}: ${ranges.join(', ')}`);
            });

            return {
                ...group,
                formattedSeats
            };
        });

        return result.sort((a, b) => a.assignedTo.localeCompare(b.assignedTo));
    };

    const assignments = groupAssignments();

    return (
        <div className="space-y-6">

            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-neutral-900/50 p-4 rounded-xl border border-white/5">

                {/* Session Toggle */}
                <div className="flex bg-black rounded-lg p-1 border border-white/10 overflow-x-auto">
                    <button
                        onClick={() => setSession('block1')}
                        className={`px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${session === 'block1' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bloque 1
                    </button>
                    <button
                        onClick={() => setSession('block2')}
                        className={`px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${session === 'block2' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bloque 2
                    </button>
                    <button
                        onClick={() => setSession('block3')}
                        className={`px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${session === 'block3' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bloque 3
                    </button>
                    <button
                        onClick={() => setSession('block4')}
                        className={`px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap ${session === 'block4' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bloque 4
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Link
                        href={`/admin/manual-assign/${session}`}
                        className="bg-[var(--primary)] hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20"
                    >
                        <UserPlus size={16} /> Gestión Manual
                    </Link>
                    <button
                        onClick={fetchData}
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/10"
                        title="Recargar"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Disponibles</p>
                        <p className="text-2xl font-bold text-indigo-400">{stats.available}</p>
                    </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Ocupadas</p>
                        <p className="text-2xl font-bold text-slate-300">{stats.occupied}</p>
                    </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Vendidas</p>
                        <p className="text-2xl font-bold text-green-400">{stats.sold}</p>
                    </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Bloqueadas</p>
                        <p className="text-2xl font-bold text-red-400">{stats.blocked}</p>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {selectedSeats.length > 0 && (
                <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-[var(--primary)] text-white px-2 py-1 rounded text-sm font-bold">{selectedSeats.length}</span>
                        <span className="text-[var(--primary)] text-sm font-medium">Entradas seleccionadas</span>
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

            {/* Assignments Detailed List */}
            <div className="mt-12 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <User className="text-[var(--primary)]" />
                        Listado de Asignaciones ({assignments.length})
                    </h3>
                </div>

                {assignments.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-gray-500">No hay butacas asignadas en este bloque.</p>
                    </div>
                ) : (
                    <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Grupo / Asignado a</th>
                                        <th className="p-4">Escuela</th>
                                        <th className="p-4">Butacas</th>
                                        <th className="p-4 text-center">Total</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {assignments.map((group, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <p className="font-bold text-white">{group.assignedTo}</p>
                                                {group.registration_id && <p className="text-[10px] text-gray-500 font-mono">{group.registration_id.slice(0, 8)}...</p>}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-gray-400 font-medium">{group.school}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 max-w-sm">
                                                    {group.formattedSeats.map((s, i) => (
                                                        <span key={i} className="bg-white/5 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/20 w-fit">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="bg-white/10 text-white px-2 py-1 rounded-full font-bold">
                                                    {group.total}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleReleaseGroup(group.registration_id, group.assignedTo)}
                                                    className="opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    Liberar Todo
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
