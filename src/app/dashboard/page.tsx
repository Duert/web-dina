"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    Upload,
    Save,
    MapPin,
    FileText,
    CheckCircle2,
    Clock,
    ChevronRight,
    LogOut,
    User as UserIcon,
    Loader2,
    Building2,
    Settings,
    ShieldCheck,
    Trash2,
    AlertTriangle,
    Music,
    Ticket,
    MessageSquare
} from "lucide-react";
import { Registration, Profile } from "@/types";
import { updateProfile, deleteRegistrationAction, deleteUserAccount, updateRegistrationMusic, getAppSettingsAction } from "@/app/actions";
import { useActionState, useRef } from "react";
// Standard in Next 15/React 19 is useActionState from react

interface RegistrationWithDetails extends Registration {
    registration_responsibles: { count: number }[];
    registration_participants: { count: number }[];
    tickets?: { count: number }[];
}

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadingMusic, setIsUploadingMusic] = useState<string | null>(null);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Make sure this exists
    const [groupRegistrationEnabled, setGroupRegistrationEnabled] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await getAppSettingsAction();
                if (res.success && res.data) {
                    setGroupRegistrationEnabled(res.data.group_registration_enabled);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };
        fetchSettings();
    }, []);
    const router = useRouter();

    // Server Action State for Edit Profile
    const [editState, formAction, isPending] = useActionState(updateProfile, { success: false, message: '' });

    useEffect(() => {
        if (editState?.success) {
            setIsEditProfileOpen(false);
            // Reload profile data locally to avoid full page refresh lag
            if (user) loadProfile(user.id);
            alert("Perfil actualizado correctamente"); // Simple feedback
        } else if (editState?.message) {
            if (editState.message === "No autenticado") {
                alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
                router.push("/login");
            } else {
                alert(editState.message);
            }
        }
    }, [editState, user, router]);

    const loadProfile = async (uid: string) => {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle();

        if (profileData) {
            setProfile(profileData);
        }



        setProfile(profileData);
    };

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            // Fetch Profile
            loadProfile(user.id);

            fetchRegistrations(user.id);

            // Polling for notifications
            const interval = setInterval(() => fetchRegistrations(user.id, true), 15000);
            return () => clearInterval(interval);
        };

        checkUser();
    }, [router]);

    const fetchRegistrations = async (userId: string, silent = false) => {
        if (!silent) setLoading(true); // Don't show full loader on poll

        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*, tickets(count)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(error);
            } else {
                setRegistrations(data || []);
                // Fetch Unread Stats
                if (data && data.length > 0) {
                    // @ts-ignore
                    const ids = data.map(r => r.id);
                    // Dynamically import or used imported action
                    const { getUserUnreadStats } = await import("@/app/actions-chat");
                    const stats = await getUserUnreadStats(ids);
                    if (stats.success && stats.data) {
                        setUnreadCounts(stats.data);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching registrations:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleMusicReupload = async (regId: string, file: File) => {
        setIsUploadingMusic(regId);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `music/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
            const res = await updateRegistrationMusic(regId, data.publicUrl);

            if (res.success) {
                // Refresh data
                const { data: { user } } = await supabase.auth.getUser();
                if (user) fetchRegistrations(user.id);
            } else {
                alert("Error al actualizar la música: " + res.message);
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsUploadingMusic(null);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="text-[var(--primary)] animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-[var(--primary)] selection:text-white">
            {/* Nav */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 group">
                        <span className="bg-[var(--primary)] text-white w-8 h-8 flex items-center justify-center rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-pink-500/20">D</span>
                        <span className="hidden sm:inline">DINA <span className="text-[var(--primary)]">2026</span></span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 text-gray-400 text-sm bg-white/5 px-4 py-2 rounded-2xl border border-white/10 group hover:border-white/20 transition-all">
                            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                <UserIcon size={12} className="group-hover:text-white transition-colors" />
                            </div>
                            <span>{user?.email}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 p-2.5 rounded-2xl transition-all"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-12">

                {/* PROFILE HEADER */}
                <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[2rem] p-8 md:p-12 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Building2 size={160} />
                    </div>

                    <button
                        onClick={() => setIsEditProfileOpen(true)}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-20"
                        title="Editar Perfil"
                    >
                        <Settings size={20} className="text-white" />
                    </button>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-[var(--primary)] font-black uppercase tracking-[0.2em] text-xs mb-4">
                            <ShieldCheck size={14} /> Panel Autorizado
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase leading-none">
                            {profile?.school_name || "TU ESCUELA"}
                        </h1>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-gray-400">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <UserIcon size={16} />
                                <span className="text-sm font-medium">{profile?.rep_name} {profile?.rep_surnames}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Building2 size={16} />
                                <span className="text-sm font-medium">Escuela Registrada</span>
                            </div>
                        </div>
                    </div>
                </div>



                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">Inscripciones <span className="text-gray-600">({registrations.length})</span></h2>
                    </div>
                    {groupRegistrationEnabled ? (
                        <Link
                            href="/registration"
                            className="bg-[var(--primary)] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={20} /> Nueva Inscripción
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="bg-gray-700 text-gray-400 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 cursor-not-allowed opacity-50"
                        >
                            <Plus size={20} /> Próximamente
                        </button>
                    )}
                </div>

                {registrations.length === 0 ? (
                    <div className="bg-white/2 border-2 border-dashed border-white/5 rounded-[2rem] p-20 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="text-gray-700" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-300 mb-2 tracking-tight">Todavía no habéis inscrito ningún grupo</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">Podéis empezar ahora mismo y guardar el borrador si os falta algún dato.</p>
                        {groupRegistrationEnabled ? (
                            <Link
                                href="/registration"
                                className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                                Comenzar Inscripción
                            </Link>
                        ) : (
                            <button
                                disabled
                                className="inline-flex items-center gap-2 bg-gray-700 text-gray-400 px-8 py-4 rounded-2xl font-bold cursor-not-allowed opacity-50"
                            >
                                Próximamente (8 de Febrero)
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {registrations.map((reg) => (
                            <div
                                key={reg.id}
                                className="group bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => router.push(`/registration?id=${reg.id}`)}
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`mt-1 p-3 rounded-2xl border ${reg.status === 'submitted' ? 'bg-green-500/10 border-green-500/20 text-green-500' : reg.status === 'submitted_modifiable' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                                        {reg.status === 'submitted' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black text-white group-hover:text-[var(--primary)] transition-colors leading-tight uppercase tracking-tight">{reg.group_name}</h3>
                                            {reg.id && unreadCounts[reg.id] && unreadCounts[reg.id] > 0 && (
                                                <div className="animate-bounce bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center gap-1">
                                                    <MessageSquare size={10} className="fill-white" />
                                                    {unreadCounts[reg.id]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                                            <div className="flex items-center gap-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${reg.original_category && reg.original_category !== reg.category ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20 animate-pulse' : 'text-white bg-white/10'}`}>
                                                    {reg.category}
                                                </span>
                                                {reg.original_category && reg.original_category !== reg.category && (
                                                    <span className="text-[10px] text-gray-600 line-through">({reg.original_category})</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Actualizado</span>
                                                <span className="text-xs font-bold text-gray-400">{new Date(reg.updated_at || reg.created_at!).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Status Tracker */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {/* 1. Inscripción */}
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${reg.is_confirmed ? 'bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                {reg.is_confirmed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                Inscripción: {reg.is_confirmed ? 'Confirmada' : 'Pendiente'}
                                            </div>

                                            {/* 2. Pago */}
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${reg.payment_verified ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                                {reg.payment_verified ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                Pago: {reg.payment_verified ? 'Validado' : 'Por Validar'}
                                            </div>

                                            {/* 3. Música */}
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all 
                                                ${reg.music_status === 'verified' ? 'bg-green-500/10 border-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                                                    reg.music_status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                                                        reg.music_file_url ? 'bg-pink-500/10 border-pink-500/20 text-pink-500 shadow-[0_0_10px_rgba(255,0,204,0.1)]' :
                                                            'bg-white/5 border-white/10 text-gray-500'}`}>
                                                {reg.music_status === 'verified' ? <CheckCircle2 size={12} /> :
                                                    reg.music_status === 'error' ? <AlertTriangle size={12} /> :
                                                        reg.music_file_url ? <Music size={12} /> : <AlertTriangle size={12} />}

                                                Música: {
                                                    reg.music_status === 'verified' ? 'Audio Verificado' :
                                                        reg.music_status === 'error' ? 'Error en archivo' :
                                                            reg.music_status === 'received' ? 'Recibida' :
                                                                reg.music_file_url ? 'Enviada' : 'Falta archivo'
                                                }
                                            </div>

                                            {/* Music Re-upload Button */}
                                            {reg.music_status === 'error' && (
                                                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-red-600 text-white border-red-500 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.4)] ${isUploadingMusic === reg.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {isUploadingMusic === reg.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                        {isUploadingMusic === reg.id ? 'Subiendo...' : 'Actualizar Música'}
                                                        <input
                                                            type="file"
                                                            accept="audio/mpeg,audio/mp3"
                                                            className="hidden"
                                                            disabled={isUploadingMusic === reg.id}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleMusicReupload(reg.id!, file);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            )}

                                            {/* 4. Entradas */}
                                            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-white/50 pt-3 border-t border-white/5">
                                                <Ticket size={12} />
                                                <span className={`${(reg.tickets?.[0]?.count ?? 0) > 0 ? "text-[var(--primary)] font-bold" : "text-gray-500"}`}>
                                                    Entradas: {reg.status === 'submitted' ? ((reg.tickets?.[0]?.count ?? 0) > 0 ? 'Asignadas' : 'Pdte. Asignar') : '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <div className={`text-[11px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full inline-block mb-1 shadow-sm ${reg.status === 'submitted' ? 'bg-green-500 text-white' : reg.status === 'submitted_modifiable' ? 'bg-orange-500 text-white animate-pulse' : 'bg-yellow-500 text-black'}`}>
                                            {reg.status === 'submitted' ? 'ENVIADO' : reg.status === 'submitted_modifiable' ? 'REQUIERE REVISIÓN' : 'BORRADOR'}
                                        </div>
                                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">
                                            Click para {reg.status === 'submitted' ? 'ver' : 'editar'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm("¿Estás seguro de que quieres BORRAR este borrador? No se puede deshacer.")) {
                                                    const res = await deleteRegistrationAction(reg.id!);
                                                    if (res.success) {
                                                        alert("Borrador eliminado.");
                                                        fetchRegistrations(user.id);
                                                    } else {
                                                        alert("Error: " + res.message);
                                                    }
                                                }
                                            }}
                                            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-gray-600 z-10"
                                            title="Borrar Borrador"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all text-gray-600">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* EDIT PROFILE MODAL */}
            {isEditProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsEditProfileOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <LogOut className="rotate-45" size={24} />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Settings className="text-[var(--primary)]" />
                            Editar Perfil
                        </h2>

                        <form action={formAction} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre de la Escuela</label>
                                <input
                                    name="school_name"
                                    defaultValue={profile?.school_name}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--primary)] outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre Rep.</label>
                                    <input
                                        name="rep_name"
                                        defaultValue={profile?.rep_name}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--primary)] outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Apellidos</label>
                                    <input
                                        name="rep_surnames"
                                        defaultValue={profile?.rep_surnames}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--primary)] outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                                <input
                                    name="phone"
                                    defaultValue={profile?.phone}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--primary)] outline-none"
                                    required
                                />
                            </div>

                            <p className="text-xs text-gray-500 mt-2">* El email no se puede cambiar ya que es tu identificador de acceso.</p>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditProfileOpen(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving} className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-bold hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} /> ZONA DE PELIGRO
                            </h3>
                            <button
                                onClick={async () => {
                                    const confirmText = prompt("Para confirmar, escribe ELIMINAR:");
                                    if (confirmText === "ELIMINAR") {
                                        const res = await deleteUserAccount();
                                        if (res.success) {
                                            alert("Tu cuenta ha sido eliminada.");
                                            window.location.href = "/";
                                        } else {
                                            alert("Error: " + res.message);
                                        }
                                    }
                                }}
                                className="w-full border border-red-500/50 text-red-500 py-3 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={20} /> Eliminar mi Cuenta
                            </button>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Esta acción es irreversible. Se borrarán todos tus datos e inscripciones.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

