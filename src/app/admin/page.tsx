"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, LayoutDashboard, Users, FileText, X, Download, Eye, Ticket, Calendar, Search, Check, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Registration } from "@/types";

// Extended interface for fetching
interface RegistrationWithDetails extends Registration {
    registration_responsibles: { count: number }[];
    registration_participants: { count: number }[];
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Data State
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'registrations' | 'sales'>('registrations');
    const [publicSalesEnabled, setPublicSalesEnabled] = useState(false);

    // --- Authentication ---

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "2026") {
            setIsAuthenticated(true);
            fetchRegistrations();
            fetchSettings();
        } else {
            setError("Código incorrecto");
        }
    };

    // --- Data Fetching ---

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from('app_settings')
            .select('public_sales_enabled')
            .eq('id', 1)
            .single();

        if (data) setPublicSalesEnabled(data.public_sales_enabled);
    };

    const toggleSales = async () => {
        const newValue = !publicSalesEnabled;
        const { error } = await supabase
            .from('app_settings')
            .update({ public_sales_enabled: newValue })
            .eq('id', 1);

        if (!error) setPublicSalesEnabled(newValue);
    };

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            // Fetch registrations with counts
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    registration_responsibles (count),
                    registration_participants (num_tickets),
                    tickets (count)
                `)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setRegistrations(data || []);
        } catch (err) {
            console.error("Error fetching registrations:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRegistrationDetails = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    registration_responsibles (*),
                    registration_participants (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setSelectedRegistration(data);
        } catch (err) {
            console.error("Error fetching details:", err);
        }
    };

    // --- UI Components ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-[var(--primary)] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,0,204,0.3)]">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Acceso Organización</h1>
                        <p className="text-gray-400 text-sm">Introduce el código de acceso</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="password"
                            className="w-full bg-black border border-white/20 rounded-xl p-4 text-center text-2xl tracking-widest text-white focus:border-[var(--primary)] outline-none transition-colors"
                            placeholder="••••"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            maxLength={4}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            ENTRAR
                        </button>
                    </form>

                    <Link href="/" className="block text-center mt-6 text-gray-500 hover:text-white text-sm">
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Heder */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-lg">Panel de Administración</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                            <span className={`text-xs font-bold ${publicSalesEnabled ? 'text-green-400' : 'text-red-400'}`}>
                                {publicSalesEnabled ? 'VENTA PÚBLICA ACTIVA' : 'VENTA PÚBLICA CERRADA'}
                            </span>
                            <button
                                onClick={toggleSales}
                                className={`w-10 h-6 rounded-full p-1 transition-colors relative ${publicSalesEnabled ? 'bg-green-500' : 'bg-neutral-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${publicSalesEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <Link
                            href="/accounting"
                            className="text-sm font-bold text-[var(--primary)] hover:text-white transition-colors border border-[var(--primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--primary)]"
                        >
                            Ver Contabilidad & Aforo
                        </Link>
                        <button onClick={() => setIsAuthenticated(false)} className="text-sm text-gray-400 hover:text-white">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'registrations' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Inscripciones
                        {activeTab === 'registrations' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'sales' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Ventas de Entradas
                        {activeTab === 'sales' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'registrations' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="text-gray-400" />
                                Grupos Inscritos
                                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300 ml-2">
                                    {registrations.length}
                                </span>
                            </h2>
                            <button
                                onClick={fetchRegistrations}
                                className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-gray-500">Cargando datos...</div>
                        ) : registrations.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-gray-500">No hay inscripciones todavía.</p>
                            </div>
                        ) : (
                            <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                            <th className="p-4 font-medium">Grupo</th>
                                            <th className="p-4 font-medium">Categoría</th>
                                            <th className="p-4 font-medium text-center">Responsables</th>
                                            <th className="p-4 font-medium text-center">Bailarines</th>
                                            <th className="p-4 font-medium text-center">Entradas Totales</th>
                                            <th className="p-4 font-medium text-center">Asignación</th>
                                            <th className="p-4 font-medium">Justificante</th>
                                            <th className="p-4 font-medium">Fecha y Hora</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {registrations.map((reg) => {
                                            // Calculate total tickets from participants
                                            const totalTickets = reg.registration_participants?.reduce((sum: number, p: any) => sum + p.num_tickets, 0) || 0;

                                            // Count dancers (rows)
                                            const dancersCount = reg.registration_participants?.length || 0;

                                            // Safe access for responsibles count
                                            const responsiblesCount = reg.registration_responsibles?.[0]?.count || 0;

                                            // Assigned tickets count
                                            const assignedTickets = reg.tickets?.[0]?.count || 0;

                                            // Status Logic
                                            let assignmentStatus = 'pending'; // pending, partial, complete
                                            if (assignedTickets >= totalTickets && totalTickets > 0) assignmentStatus = 'complete';
                                            else if (assignedTickets > 0) assignmentStatus = 'partial';

                                            return (
                                                <tr key={reg.id} className="group hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold text-white">
                                                        {reg.group_name}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded text-sm">
                                                            {reg.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-gray-400">
                                                        {responsiblesCount}
                                                    </td>
                                                    <td className="p-4 text-center text-white font-medium">
                                                        {dancersCount}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-white/10 text-white font-bold px-3 py-1 rounded-full">{totalTickets}</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {assignmentStatus === 'complete' && (
                                                            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-500/30">
                                                                <Check size={14} /> COMPLETO
                                                            </span>
                                                        )}
                                                        {assignmentStatus === 'partial' && (
                                                            <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold border border-yellow-500/30">
                                                                <Clock size={14} /> {assignedTickets} / {totalTickets}
                                                            </span>
                                                        )}
                                                        {assignmentStatus === 'pending' && (
                                                            <span className="text-gray-600 text-xs font-bold">Sin asignar</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {reg.payment_proof_url ? (
                                                            <a
                                                                href={reg.payment_proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium"
                                                            >
                                                                <FileText size={16} /> Ver Justificante
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600 text-sm">Pendiente</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-400 font-mono">
                                                        {new Date(reg.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => fetchRegistrationDetails(reg.id)}
                                                            className="bg-white text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                                                        >
                                                            Ver Detalles
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Próximamente</h3>
                        <p className="text-gray-500">El módulo de ventas de entradas estará disponible pronto.</p>
                    </div>
                )}
            </main>

            {/* DETAIL MODAL */}
            {selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-black/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{selectedRegistration.group_name}</h2>
                                <div className="flex gap-2 text-sm text-gray-400">
                                    <span>Cat: {selectedRegistration.category}</span>
                                    <span>•</span>
                                    <span>Inscrito el {new Date(selectedRegistration.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/admin/assign/${selectedRegistration.id}`}
                                    className="bg-[var(--primary)] hover:bg-pink-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,0,204,0.4)] flex items-center gap-2"
                                >
                                    <Ticket size={16} /> Asignar Asientos
                                </Link>
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-y-auto p-8 space-y-8">

                            {/* Responsibles */}
                            <div>
                                <h3 className="text-lg font-bold text-[var(--primary)] mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5" /> Responsables
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedRegistration.registration_responsibles?.map((resp: any) => (
                                        <div key={resp.id} className="bg-black/30 p-4 rounded-xl border border-white/5">
                                            <p className="font-bold text-white">{resp.name} {resp.surnames}</p>
                                            <p className="text-gray-400 text-sm mt-1">{resp.phone}</p>
                                            <p className="text-gray-400 text-sm">{resp.email}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            {/* Participants */}
                            <div>
                                <h3 className="text-lg font-bold text-[var(--primary)] mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Participantes
                                </h3>
                                <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                                            <tr>
                                                <th className="p-3 font-medium">Nombre</th>
                                                <th className="p-3 font-medium">F. Nacim</th>
                                                <th className="p-3 font-medium text-center">Entradas</th>
                                                <th className="p-3 font-medium text-right">Autorización</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {selectedRegistration.registration_participants?.map((part: any) => (
                                                <tr key={part.id} className="hover:bg-white/5">
                                                    <td className="p-3 font-medium">{part.name} {part.surnames}</td>
                                                    <td className="p-3 text-gray-400">{new Date(part.dob).toLocaleDateString()}</td>
                                                    <td className="p-3 text-center">{part.num_tickets}</td>
                                                    <td className="p-3 text-right">
                                                        {part.authorization_url ? (
                                                            <a href={part.authorization_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--primary)] hover:text-white transition-colors">
                                                                <FileText size={14} /> <span className="underline">Ver Archivo</span>
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600 italic">No subida</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-blue-200 text-sm">Justificante de Pago</h4>
                                    <p className="text-blue-200/60 text-xs">Concepto: {selectedRegistration.group_name} + Entradas</p>
                                </div>
                                {selectedRegistration.payment_proof_url ? (
                                    <a
                                        href={selectedRegistration.payment_proof_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Eye size={16} /> Ver Justificante
                                    </a>
                                ) : (
                                    <span className="text-gray-500 text-sm font-bold">No adjuntado</span>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function User(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
