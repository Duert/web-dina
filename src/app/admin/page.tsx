"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Building, Download, RefreshCw, Trash2, Gavel, Lock, LayoutDashboard, FileText, X, Eye, Ticket, Calendar, Search, Check, Clock, AlertTriangle, Building2, Mail, Phone, Music } from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import { deleteRegistration, resetApplicationData } from "@/app/actions-admin";
import AdminJudgesManager from "@/components/admin-judges-manager";
import AdminFAQManager from "@/components/admin-faq-manager";
import AdminCouponManager from "@/components/admin-coupon-manager";
import { Registration } from "@/types";
import dynamic from "next/dynamic";
import { RegistrationDocument } from "@/components/pdf/RegistrationDocument";
import { PDFExportButton } from "@/components/pdf/PDFExportButton";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <p>Cargando PDF...</p>,
    }
);

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
    const [activeTab, setActiveTab] = useState<'registrations' | 'sales' | 'schools' | 'config' | 'judges' | 'faq' | 'coupons'>('registrations');
    const [publicSalesEnabled, setPublicSalesEnabled] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // School View State
    const [schools, setSchools] = useState<any[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
    const [schoolRegistrations, setSchoolRegistrations] = useState<any[]>([]);

    // --- Authentication ---

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "2026") {
            setIsAuthenticated(true);
            fetchRegistrations();
            fetchSettings();
            fetchSchools(); // Pre-fetch schools on login too
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
    const handleResetData = async () => {
        if (confirm("⚠️ ¡PELIGRO! ⚠️\n\n¿Estás SEGURO de que quieres borrar TODOS los datos?\n\nEsto eliminará permanentemente:\n- Todos los pedidos y pagos\n- Todas las inscripciones\n- Liberará todas las butacas\n\nEsta acción NO se puede deshacer.")) {
            if (confirm("Última confirmación: ¿De verdad quieres empezar de cero?")) {
                setIsResetting(true);
                try {
                    const result = await resetApplicationData();
                    if (result.success) {
                        alert("✅ Datos restablecidos correctamente.");
                        // Refresh local state
                        fetchRegistrations();
                    } else {
                        alert("❌ Error: " + result.error);
                    }
                } catch (e: any) {
                    alert("❌ Error de conexión: " + e.message);
                } finally {
                    setIsResetting(false);
                }
            }
        }
    };

    const fetchSchools = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('school_name', { ascending: true });

        if (error) {
            console.error("Error fetching schools", error);
        } else {
            setSchools(data || []);
        }
    };

    const fetchSchoolRegistrations = async (userId: string) => {
        setSchoolRegistrations([]); // Clear previous
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                *,
                registration_responsibles (count),
                registration_participants (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error) {
            setSchoolRegistrations(data || []);
        }
    };

    const openSchoolDetails = (school: any) => {
        setSelectedSchool(school);
        fetchSchoolRegistrations(school.id);
    };

    // --- Export Logic ---

    const handleExportExcel = () => {
        if (registrations.length === 0) return;

        const dataToExport = registrations.map(reg => {
            // Flatten data for Excel
            const responsible = reg.registration_responsibles?.[0] || {};
            const totalParticipants = reg.registration_participants?.length || 0;
            const totalTickets = reg.registration_participants?.reduce((acc: number, curr: any) => acc + curr.num_tickets, 0) || 0;

            return {
                "Fecha Inscripción": new Date(reg.created_at).toLocaleDateString(),
                "Estado": reg.status,
                "Grupo": reg.group_name,
                "Escuela": reg.school_name || "",
                "Categoría": reg.category,
                "Responsable Nombre": responsible.name || "",
                "Responsable Teléfono": responsible.phone || "",
                "Responsable Email": responsible.email || "",
                "Num Bailarines": totalParticipants,
                "Total Entradas": totalTickets,
                "Pagado": reg.payment_proof_url ? "Sí (Justificante)" : "No",
                "Música Subida": reg.music_file_url ? "Sí" : "No"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inscripciones");
        XLSX.writeFile(workbook, `Inscripciones_DINA_${new Date().toISOString().split('T')[0]}.xlsx`);
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

                <div className="flex gap-4 mb-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'registrations' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Inscripciones
                        {activeTab === 'registrations' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('schools')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'schools' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Escuelas
                        {activeTab === 'schools' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'sales' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Ventas de Entradas
                        {activeTab === 'sales' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('judges')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'judges' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Jurado
                        {activeTab === 'judges' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'faq' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        FAQ
                        {activeTab === 'faq' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'coupons' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Cupones
                        {activeTab === 'coupons' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'config' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Configuración
                        {activeTab === 'config' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
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
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={18} /> Exportar Excel
                                </button>
                                <PDFExportButton registrations={registrations} />
                                <button
                                    onClick={fetchRegistrations}
                                    className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
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
                                            <th className="p-4 font-medium">Grupo / Escuela</th>
                                            <th className="p-4 font-medium text-center">Estado</th>
                                            <th className="p-4 font-medium">Categoría</th>
                                            <th className="p-4 font-medium text-center">Resp.</th>
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
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">{reg.group_name}</div>
                                                        {reg.school_name && <div className="text-[10px] text-gray-500 uppercase font-black">{reg.school_name}</div>}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${reg.status === 'submitted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                                                            {reg.status === 'submitted' ? 'Enviado' : 'Borrador'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded text-sm font-medium">
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
                ) : activeTab === 'schools' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Building className="text-gray-400" />
                                Escuelas Registradas
                                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300 ml-2">
                                    {schools.length}
                                </span>
                            </h2>
                            <button
                                onClick={fetchSchools}
                                className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>

                        {schools.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-gray-500">No hay escuelas registradas.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {schools.map((school) => (
                                    <div
                                        key={school.id}
                                        onClick={() => openSchoolDetails(school)}
                                        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Ver Detalles
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[var(--primary)] transition-colors">{school.school_name}</h3>
                                        <p className="text-sm text-gray-400 mb-4">{school.rep_name} {school.rep_surnames}</p>

                                        <div className="border-t border-white/5 pt-4 space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Mail size={14} /> {school.rep_email}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Phone size={14} /> {school.rep_phone}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'judges' ? (
                    <AdminJudgesManager />
                ) : activeTab === 'faq' ? (
                    <AdminFAQManager />
                ) : activeTab === 'coupons' ? (
                    <AdminCouponManager />
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Próximamente</h3>
                        <p className="text-gray-500">El módulo de ventas de entradas estará disponible pronto.</p>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-2xl">
                            <h3 className="text-red-500 font-bold text-xl flex items-center gap-2 mb-4">
                                <AlertTriangle /> Zona de Peligro
                            </h3>
                            <p className="text-gray-400 mb-6 text-sm">
                                Estas acciones son destructivas y no se pueden deshacer. Ten cuidado.
                            </p>

                            <div className="bg-black/30 p-4 rounded-xl border border-red-500/10 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-white">Restablecer Aplicación</h4>
                                    <p className="text-xs text-gray-500 mt-1">Borra todos los pedidos, inscripciones y libera butacas.</p>
                                </div>
                                <button
                                    onClick={handleResetData}
                                    disabled={isResetting}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isResetting ? 'Borrando...' : 'Borrar Todos los Datos'}
                                </button>
                            </div>
                        </div>
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
                                {selectedRegistration && (
                                    <PDFDownloadLink
                                        document={<RegistrationDocument registration={selectedRegistration} />}
                                        fileName={`Inscripcion_${selectedRegistration.group_name.replace(/\s+/g, '_')}.pdf`}
                                        className="bg-white/10 hover:bg-white/20 hover:text-white text-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {/* @ts-ignore */}
                                        {({ loading }) => (
                                            <>
                                                <Download size={16} />
                                                {loading ? 'Generando...' : 'Descargar PDF'}
                                            </>
                                        )}
                                    </PDFDownloadLink>
                                )}
                                <Link
                                    href={`/admin/assign/${selectedRegistration.id}`}
                                    className="bg-[var(--primary)] hover:bg-pink-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,0,204,0.4)] flex items-center gap-2"
                                >
                                    <Ticket size={16} /> Asignar Asientos
                                </Link>

                                <button
                                    onClick={async () => {
                                        if (confirm("¿Estás seguro de que quieres BORRAR esta inscripción? Se liberarán todos sus asientos asignados.")) {
                                            const res = await deleteRegistration(selectedRegistration.id);
                                            if (res.success) {
                                                alert("Inscripción borrada y asientos liberados.");
                                                setSelectedRegistration(null);
                                                // If inside school view, refresh school registrations too
                                                if (selectedSchool) {
                                                    fetchSchoolRegistrations(selectedSchool.id);
                                                }
                                                fetchRegistrations();
                                            } else {
                                                alert("Error: " + res.error);
                                            }
                                        }
                                    }}
                                    className="bg-red-500/20 hover:bg-red-500/40 text-red-500 hover:text-red-200 p-2 rounded-lg transition-colors"
                                    title="Borrar Inscripción"
                                >
                                    <Trash2 size={20} />
                                </button>

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

                            {/* Music */}
                            <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-pink-200 text-sm">Música Coreografía</h4>
                                    <p className="text-pink-200/60 text-xs">Archivo MP3 para la actuación</p>
                                </div>
                                {selectedRegistration.music_file_url ? (
                                    <a
                                        href={selectedRegistration.music_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="bg-pink-500 hover:bg-pink-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <Music size={16} /> Descargar / Escuchar
                                    </a>
                                ) : (
                                    <span className="text-gray-500 text-sm font-bold">No subida</span>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* SCHOOL DETAIL MODAL */}
            {selectedSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                        {/* Heading */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
                                    <Building size={24} className="text-[var(--primary)]" />
                                    {selectedSchool.school_name}
                                </h2>
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                    <User size={14} /> {selectedSchool.rep_name} {selectedSchool.rep_surnames}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSchool(null)}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">

                            {/* School Contact Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 uppercase font-black mb-1">Email de Contacto</p>
                                    <p className="text-white font-medium break-all">{selectedSchool.rep_email}</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 uppercase font-black mb-1">Teléfono</p>
                                    <p className="text-white font-medium">{selectedSchool.rep_phone}</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-gray-500 uppercase font-black mb-1">Inscripciones Totales</p>
                                    <p className="text-xl font-bold text-[var(--primary)]">{schoolRegistrations.length}</p>
                                </div>
                            </div>

                            {/* Registrations List */}
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-gray-400" />
                                Grupos Inscritos
                            </h3>

                            {schoolRegistrations.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-500">Esta escuela no tiene inscripciones registradas.</p>
                                </div>
                            ) : (
                                <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                                <th className="p-3 font-medium">Nombre Grupo</th>
                                                <th className="p-3 font-medium">Categoría</th>
                                                <th className="p-3 font-medium text-center">Estado</th>
                                                <th className="p-3 font-medium text-center">Tarde/Mañana</th>
                                                <th className="p-3 font-medium text-center">Entradas</th>
                                                <th className="p-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {schoolRegistrations.map((reg: any) => (
                                                <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-bold text-white">{reg.group_name}</td>
                                                    <td className="p-3 text-sm text-gray-300">{reg.category}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${reg.status === 'submitted' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            {reg.status === 'submitted' ? 'Enviado' : 'Borrador'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center text-sm text-gray-400">
                                                        {/* Session logic could be added here if session is stored, otherwise blank */}
                                                        -
                                                    </td>
                                                    <td className="p-3 text-center font-bold">
                                                        {reg.registration_participants?.reduce((acc: number, curr: any) => acc + curr.num_tickets, 0) || 0}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => fetchRegistrationDetails(reg.id)}
                                                            className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold transition-colors"
                                                        >
                                                            Ver Completo
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

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
