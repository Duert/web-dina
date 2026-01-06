"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ChevronLeft,
    Plus,
    Trash2,
    Users,
    User as UserIcon,
    Save,
    Upload,
    FileText,
    CreditCard,
    Loader2,
    CheckCircle2,
    Music
} from "lucide-react";
import { DanceCategory, Registration, RegistrationResponsible, RegistrationParticipant } from "@/types";
import { supabase } from "@/lib/supabase";
import { sendRegistrationEmail } from "@/app/actions-email";

function RegistrationForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const registrationIdParam = searchParams.get("id");

    const [registrationId, setRegistrationId] = useState<string | null>(registrationIdParam);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [groupName, setGroupName] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [category, setCategory] = useState<DanceCategory>("Absoluta");
    const [responsibles, setResponsibles] = useState<RegistrationResponsible[]>([
        { name: "", surnames: "", phone: "", email: "" }
    ]);
    const [participants, setParticipants] = useState<RegistrationParticipant[]>([]);
    const [paymentProofUrls, setPaymentProofUrls] = useState<string[]>([]);
    const [musicFileUrl, setMusicFileUrl] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<'draft' | 'submitted'>('draft');

    // File States (Local only, not saved to DB until upload)
    const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
    const [musicFile, setMusicFile] = useState<File | null>(null);
    const [participantAuthFiles, setParticipantAuthFiles] = useState<{ [key: number]: File }>({});
    const [participantDniFiles, setParticipantDniFiles] = useState<{ [key: number]: File }>({});
    const [responsibleDniFiles, setResponsibleDniFiles] = useState<{ [key: number]: File }>({});

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login?redirect=/registration" + (registrationIdParam ? `?id=${registrationIdParam}` : ""));
                return;
            }
            setUserId(user.id);
            if (registrationIdParam) {
                loadRegistration(registrationIdParam);
            } else {
                setLoading(false);
            }
        };

        checkAuth();
    }, [registrationIdParam, router]);

    const loadRegistration = async (id: string | null) => {
        if (!id) return;
        try {
            // Load core registration
            const { data: reg, error: regErr } = await supabase
                .from('registrations')
                .select('*')
                .eq('id', id)
                .single();

            if (regErr) throw regErr;
            if (reg.status === 'submitted') {
                router.push("/dashboard"); // Don't allow editing submitted ones for now, or just show read-only?
                return;
            }

            setGroupName(reg.group_name || "");
            setSchoolName(reg.school_name || "");
            setCategory(reg.category || "Absoluta");
            setNotes(reg.notes || "");

            // Handle Payment Proofs (Backward combatibility)
            if (reg.payment_proof_urls && reg.payment_proof_urls.length > 0) {
                setPaymentProofUrls(reg.payment_proof_urls);
            } else if (reg.payment_proof_url) {
                setPaymentProofUrls([reg.payment_proof_url]);
            } else {
                setPaymentProofUrls([]);
            }

            setMusicFileUrl(reg.music_file_url || null);
            setStatus(reg.status || 'draft');

            // Load Responsibles
            const { data: resps } = await supabase
                .from('registration_responsibles')
                .select('*')
                .eq('registration_id', id);
            if (resps && resps.length > 0) setResponsibles(resps);

            // Load Participants
            const { data: parts } = await supabase
                .from('registration_participants')
                .select('*')
                .eq('registration_id', id);
            if (parts) setParticipants(parts);

        } catch (err) {
            console.error(err);
            setError("Error al cargar la inscripción");
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---

    const addResponsible = () => {
        if (responsibles.length < 3) {
            setResponsibles([...responsibles, { name: "", surnames: "", phone: "", email: "" }]);
        }
    };

    const removeResponsible = (index: number) => {
        setResponsibles(responsibles.filter((_, i) => i !== index));
    };

    const updateResponsible = (index: number, field: keyof RegistrationResponsible, value: string) => {
        const newList = [...responsibles];
        newList[index] = { ...newList[index], [field]: value };
        setResponsibles(newList);
    };

    const addParticipant = () => {
        if (participants.length < 40) {
            setParticipants([...participants, { name: "", surnames: "", dob: "", num_tickets: 0 }]);
        }
    };

    const removeParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index));

        const newAuthFiles = { ...participantAuthFiles };
        delete newAuthFiles[index];
        setParticipantAuthFiles(newAuthFiles);

        const newDniFiles = { ...participantDniFiles };
        delete newDniFiles[index];
        setParticipantDniFiles(newDniFiles);
    };

    const updateParticipant = (index: number, field: keyof RegistrationParticipant, value: any) => {
        const newList = [...participants];
        // @ts-ignore
        newList[index] = { ...newList[index], [field]: value };
        setParticipants(newList);
    };

    const handleParticipantAuthFileChange = (index: number, file: File) => {
        setParticipantAuthFiles(prev => ({ ...prev, [index]: file }));
    };

    const handleParticipantDniFileChange = (index: number, file: File) => {
        setParticipantDniFiles(prev => ({ ...prev, [index]: file }));
    };

    const handleResponsibleDniFileChange = (index: number, file: File) => {
        setResponsibleDniFiles(prev => ({ ...prev, [index]: file }));
    };

    const handlePaymentFilesChange = (files: FileList | null) => {
        if (!files) return;
        setPaymentFiles(prev => [...prev, ...Array.from(files)]);
    };

    const removePaymentFile = (index: number) => {
        setPaymentFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removePaymentProofUrl = (index: number) => {
        setPaymentProofUrls(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFile = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
        return data.publicUrl;
    };

    // --- SAVE LOGIC ---

    const saveToDB = async (finalStatus: 'draft' | 'submitted') => {
        setError(null);
        try {
            // 1. Upload new files if any
            // Payment Files
            const newPaymentUrls = [];
            for (const file of paymentFiles) {
                const url = await uploadFile(file, 'payments');
                newPaymentUrls.push(url);
            }
            const finalPaymentUrls = [...paymentProofUrls, ...newPaymentUrls];

            // Music File
            let currentMusicUrl = musicFileUrl;
            if (musicFile) {
                currentMusicUrl = await uploadFile(musicFile, 'music');
            }

            // 2. Upsert Registration
            const regPayload = {
                group_name: groupName,
                school_name: schoolName,
                category,
                payment_proof_urls: finalPaymentUrls,
                music_file_url: currentMusicUrl,
                notes,
                status: finalStatus,
                user_id: userId
            };

            let currentRegId = registrationId;

            if (currentRegId) {
                const { error: updErr } = await supabase
                    .from('registrations')
                    .update(regPayload)
                    .eq('id', currentRegId);
                if (updErr) throw updErr;
            } else {
                const { data: newReg, error: insErr } = await supabase
                    .from('registrations')
                    .insert([regPayload])
                    .select()
                    .single();
                if (insErr) throw insErr;
                currentRegId = newReg.id;
                setRegistrationId(currentRegId);
            }

            // 3. Upsert Responsibles
            await supabase.from('registration_responsibles').delete().eq('registration_id', currentRegId);
            if (responsibles.length > 0) {
                const responsiblesWithFiles = await Promise.all(responsibles.map(async (r, idx) => {
                    let dniUrl = r.dni_url || null;
                    if (responsibleDniFiles[idx]) {
                        dniUrl = await uploadFile(responsibleDniFiles[idx], 'dnis');
                    }
                    const { id, ...rest } = r;
                    return { ...rest, registration_id: currentRegId, dni_url: dniUrl };
                }));

                const { error: respErr } = await supabase
                    .from('registration_responsibles')
                    .insert(responsiblesWithFiles);
                if (respErr) throw respErr;
            }

            // 4. Upsert Participants
            const participantsWithUrls = await Promise.all(participants.map(async (p, idx) => {
                let authUrl = p.authorization_url || null;
                if (participantAuthFiles[idx]) {
                    authUrl = await uploadFile(participantAuthFiles[idx], 'authorizations');
                }

                let dniUrl = p.dni_url || null;
                if (participantDniFiles[idx]) {
                    dniUrl = await uploadFile(participantDniFiles[idx], 'dnis');
                }

                const { id, ...rest } = p;
                return {
                    ...rest,
                    registration_id: currentRegId,
                    authorization_url: authUrl,
                    dni_url: dniUrl
                };
            }));

            await supabase.from('registration_participants').delete().eq('registration_id', currentRegId);
            if (participantsWithUrls.length > 0) {
                const { error: partErr } = await supabase
                    .from('registration_participants')
                    .insert(participantsWithUrls);
                if (partErr) throw partErr;
            }

            if (finalStatus === 'submitted') {
                try {
                    await sendRegistrationEmail(currentRegId!);
                } catch (e) { console.error("Email error:", e); }
                setSuccess(true);
            } else {
                alert("Borrador guardado correctamente.");
                // Reset file states locally to avoid re-uploading duplicateLogic if user clicks save again immediately
                setPaymentFiles([]);
                setParticipantAuthFiles({});
                setParticipantDniFiles({});
                setResponsibleDniFiles({});
                // Reload to sync state
                loadRegistration(currentRegId!);
                // router.refresh();
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al procesar la inscripción.");
            return false;
        }
        return true;
    };

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        await saveToDB('draft');
        setSavingDraft(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Final validation
        if (paymentFiles.length === 0 && paymentProofUrls.length === 0) {
            setError("Por favor, sube el justificante de pago para finalizar.");
            return;
        }

        setSubmitting(true);
        await saveToDB('submitted');
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="text-[var(--primary)] animate-spin" size={40} />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold mb-4 tracking-tighter uppercase">¡Inscripción Presentada!</h1>
                <p className="text-xl text-gray-400 max-w-lg mb-8">
                    Se han enviado los datos del grupo <strong>{groupName}</strong> correctamente.
                    <br />Nos pondremos en contacto pronto a través de los responsables.
                </p>
                <Link href="/dashboard" className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
                    Ir a mi Panel
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4">
                        <ChevronLeft />
                    </Link>
                    <h1 className="font-bold text-xl tracking-wide uppercase">
                        {registrationId ? 'EDITAR INSCRIPCIÓN' : 'NUEVA INSCRIPCIÓN'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft || submitting}
                        className="hidden sm:flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        {savingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Borrador
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
                <form onSubmit={handleSubmit} className="space-y-12">

                    {/* SECTION 1: GROUP INFO */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 text-[var(--primary)]">
                            <Users className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Datos de la Inscripción</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Nombre del Grupo</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-3 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="Ej. Dancers United"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Escuela de Baile / Academia</label>
                                <input
                                    type="text"
                                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-3 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all"
                                    value={schoolName}
                                    onChange={e => setSchoolName(e.target.value)}
                                    placeholder="Nombre de la escuela"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Categoría</label>
                                <select
                                    className="w-full bg-neutral-900 border border-white/10 rounded-lg p-3 focus:border-[var(--primary)] outline-none"
                                    value={category}
                                    onChange={e => setCategory(e.target.value as DanceCategory)}
                                >
                                    <option value="Baby">Cat. Baby</option>
                                    <option value="Infantil">Cat. Infantil</option>
                                    <option value="Junior">Cat. Junior</option>
                                    <option value="Mini-parejas">Cat. Mini-parejas</option>
                                    <option value="Juvenil">Cat. Juvenil</option>
                                    <option value="Absoluta">Cat. Absoluta</option>
                                    <option value="Parejas">Cat. Parejas</option>
                                    <option value="Premium">Cat. Premium</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* SECTION 2: RESPONSIBLES */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[var(--primary)]">
                                <UserIcon className="w-6 h-6" />
                                <h2 className="text-2xl font-bold">Responsables ({responsibles.length}/3)</h2>
                            </div>
                            {responsibles.length < 3 && (
                                <button type="button" onClick={addResponsible} className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-gray-300">
                                    <Plus size={16} /> Añadir
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {responsibles.map((resp, idx) => (
                                <div key={idx} className="bg-neutral-900/50 border border-white/5 rounded-xl p-4 relative group">
                                    {responsibles.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeResponsible(idx)}
                                            className="absolute top-4 right-4 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            required
                                            placeholder="Nombre"
                                            className="bg-transparent border-b border-white/10 focus:border-[var(--primary)] p-2 outline-none"
                                            value={resp.name}
                                            onChange={e => updateResponsible(idx, 'name', e.target.value)}
                                        />
                                        <input
                                            required
                                            placeholder="Apellidos"
                                            className="bg-transparent border-b border-white/10 focus:border-[var(--primary)] p-2 outline-none"
                                            value={resp.surnames}
                                            onChange={e => updateResponsible(idx, 'surnames', e.target.value)}
                                        />
                                        <input
                                            required
                                            type="tel"
                                            placeholder="Teléfono"
                                            className="bg-transparent border-b border-white/10 focus:border-[var(--primary)] p-2 outline-none"
                                            value={resp.phone}
                                            onChange={e => updateResponsible(idx, 'phone', e.target.value)}
                                        />
                                        <input
                                            required
                                            type="email"
                                            placeholder="Email"
                                            className="bg-transparent border-b border-white/10 focus:border-[var(--primary)] p-2 outline-none"
                                            value={resp.email}
                                            onChange={e => updateResponsible(idx, 'email', e.target.value)}
                                        />
                                        <div className="col-span-1 md:col-span-2 mt-2">
                                            <label className="flex items-center gap-4 cursor-pointer group/dni">
                                                <div className={`p-2 rounded-lg border border-dashed transition-all ${responsibleDniFiles[idx] || resp.dni_url ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/20 text-gray-400 group-hover/dni:border-white/40 group-hover/dni:text-white'}`}>
                                                    <CreditCard size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-gray-300">
                                                        {responsibleDniFiles[idx] ? responsibleDniFiles[idx].name : (resp.dni_url ? "DNI Subido ✓" : "Subir DNI (Frontal/Reverso)")}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">Obligatorio para el registro</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) handleResponsibleDniFileChange(idx, e.target.files[0]);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* SECTION 3: PARTICIPANTS */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[var(--primary)]">
                                <Users className="w-6 h-6" />
                                <h2 className="text-2xl font-bold">Participantes ({participants.length}/40)</h2>
                            </div>
                            {participants.length < 40 && (
                                <button type="button" onClick={addParticipant} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-bold hover:bg-pink-600 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,204,0.3)]">
                                    <Plus size={18} /> Añadir Participante
                                </button>
                            )}
                        </div>

                        {participants.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-gray-500">Añade a los bailarines del grupo.</p>
                            </div>
                        ) : (
                            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                            <th className="p-4 font-medium">Datos Básicos</th>
                                            <th className="p-4 font-medium text-center">Entradas</th>
                                            <th className="p-4 font-medium text-center">Autorización</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {participants.map((p, idx) => (
                                            <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                                <td className="p-4 space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            required
                                                            placeholder="Nombre"
                                                            className="w-full bg-transparent p-2 rounded focus:bg-black/50 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                            value={p.name}
                                                            onChange={e => updateParticipant(idx, 'name', e.target.value)}
                                                        />
                                                        <input
                                                            required
                                                            placeholder="Apellidos"
                                                            className="w-full bg-transparent p-2 rounded focus:bg-black/50 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                            value={p.surnames}
                                                            onChange={e => updateParticipant(idx, 'surnames', e.target.value)}
                                                        />
                                                    </div>
                                                    <input
                                                        required
                                                        type="date"
                                                        className="w-full bg-transparent p-2 rounded focus:bg-black/50 outline-none focus:ring-1 focus:ring-[var(--primary)] [color-scheme:dark] text-sm"
                                                        value={p.dob}
                                                        onChange={e => updateParticipant(idx, 'dob', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4 align-top">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-20 mx-auto block text-center bg-transparent p-2 rounded focus:bg-black/50 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                                        value={p.num_tickets}
                                                        onChange={e => updateParticipant(idx, 'num_tickets', parseInt(e.target.value))}
                                                    />
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="cursor-pointer inline-flex items-center gap-2 group/upload">
                                                            <div className={`p-1.5 rounded-lg border border-dashed transition-all ${participantAuthFiles[idx] || p.authorization_url ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/20 text-gray-500 hover:border-white/40 hover:text-white'}`}>
                                                                {participantAuthFiles[idx] || p.authorization_url ? <FileText size={16} /> : <Upload size={16} />}
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 max-w-[80px] truncate">
                                                                {participantAuthFiles[idx] ? participantAuthFiles[idx].name : (p.authorization_url ? "Auth. OK" : "Autorización")}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*,.pdf"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) handleParticipantAuthFileChange(idx, e.target.files[0]);
                                                                }}
                                                            />
                                                        </label>

                                                        <label className="cursor-pointer inline-flex items-center gap-2 group/upload">
                                                            <div className={`p-1.5 rounded-lg border border-dashed transition-all ${participantDniFiles[idx] || p.dni_url ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/20 text-gray-500 hover:border-white/40 hover:text-white'}`}>
                                                                {participantDniFiles[idx] || p.dni_url ? <CreditCard size={16} /> : <Upload size={16} />}
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 max-w-[80px] truncate">
                                                                {participantDniFiles[idx] ? participantDniFiles[idx].name : (p.dni_url ? "DNI OK" : "Subir DNI")}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*,.pdf"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) handleParticipantDniFileChange(idx, e.target.files[0]);
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeParticipant(idx)}
                                                        className="text-gray-600 hover:text-red-500 transition-colors p-2"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <hr className="border-white/10" />

                    {/* SECTION 5: MUSIC */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 text-[var(--primary)]">
                            <Music className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Música de la Coreografía</h2>
                        </div>

                        <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl md:flex gap-8 items-start">
                            <div className="flex-1 space-y-4">
                                <p className="text-gray-300">
                                    Sube el archivo de audio (MP3) que se utilizará durante la actuación.
                                    <br />Asegúrate de que la calidad sea buena y que corresponda con la versión final.
                                </p>
                            </div>

                            <div className="mt-6 md:mt-0 md:w-1/3">
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all ${musicFile || musicFileUrl ? 'border-pink-500 bg-pink-500/5' : 'border-white/20'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                        {musicFile || musicFileUrl ? (
                                            <>
                                                <Music className="w-8 h-8 text-pink-500 mb-2" />
                                                <p className="text-xs text-gray-300 font-medium truncate w-full">
                                                    {musicFile ? musicFile.name : "Música subida ✓"}
                                                </p>
                                                <p className="text-[10px] text-pink-500 mt-1 font-bold">Cambiar archivo</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-400 font-medium tracking-tight">Subir MP3</p>
                                                <p className="text-[10px] text-gray-500 mt-1">Audio MP3</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setMusicFile(e.target.files[0]);
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* SECTION 4: PAYMENT */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 text-[var(--primary)]">
                            <CreditCard className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Pago Inscripción</h2>
                        </div>

                        <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl md:flex gap-8 items-start">
                            <div className="flex-1 space-y-4">
                                <p className="text-gray-300">
                                    Por favor, realiza el pago correspondiente y sube aquí el justificante para poder enviar la inscripción definitiva.
                                </p>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                                    <p className="text-yellow-200 text-sm font-medium">🔔 IMPORTANTE: CONCEPTO</p>
                                    <p className="text-yellow-100/80 text-sm mt-1">
                                        En el concepto de la transferencia debes poner: <br />
                                        <strong className="text-white">"{groupName || 'Nombre Grupo'} + Entradas/Inscripciones"</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 md:mt-0 md:w-1/3">
                                <div className="space-y-3">
                                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all border-white/20`}>
                                        <div className="flex flex-col items-center justify-center pt-2 pb-3 text-center px-4">
                                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                            <p className="text-xs text-gray-400 font-medium tracking-tight">Añadir Archivo</p>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            onChange={(e) => handlePaymentFilesChange(e.target.files)}
                                        />
                                    </label>

                                    {/* File List */}
                                    <div className="space-y-2">
                                        {/* Existing URLs */}
                                        {paymentProofUrls.map((url, idx) => (
                                            <div key={`url-${idx}`} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-[var(--primary)]/30">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                                                    <span className="text-xs text-gray-300 truncate">Justificante {idx + 1} (Guardado)</span>
                                                </div>
                                                <button type="button" onClick={() => removePaymentProofUrl(idx)} className="text-gray-500 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* New Files */}
                                        {paymentFiles.map((file, idx) => (
                                            <div key={`file-${idx}`} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-300 truncate">{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => removePaymentFile(idx)} className="text-gray-500 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* SECTION 6: NOTES */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 text-[var(--primary)]">
                            <FileText className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Notas a la Organización</h2>
                        </div>
                        <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl">
                            <textarea
                                className="w-full bg-transparent outline-none min-h-[100px] p-2 text-gray-300 placeholder:text-gray-600 resize-none"
                                placeholder="Escribe aquí cualquier comentario, duda o aclaración..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </section>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl text-center animate-in shake font-bold">
                            {error}
                        </div>
                    )}

                    <div className="pt-8 pb-20 flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={savingDraft || submitting}
                            className="flex-1 sm:hidden bg-white/5 text-white font-bold py-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {savingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            GUARDAR BORRADOR
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || savingDraft}
                            className="flex-[2] bg-[var(--primary)] text-white text-xl font-black py-6 rounded-2xl shadow-[0_0_30px_rgba(255,0,204,0.4)] hover:shadow-[0_0_50px_rgba(255,0,204,0.6)] hover:bg-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {submitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                            {submitting ? 'ENVIANDO...' : 'ENVIAR INSCRIPCIÓN DEFINITIVA'}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}

export default function RegistrationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[var(--primary)]" /></div>}>
            <RegistrationForm />
        </Suspense>
    );
}
