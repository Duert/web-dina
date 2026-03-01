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
    Music,
    MessageSquare
} from "lucide-react";
import { DanceCategory, Registration, RegistrationResponsible, RegistrationParticipant } from "@/types";
import { supabase } from "@/lib/supabase";
import { sendRegistrationEmail } from "@/app/actions-email";
import { ChatSection } from "@/components/chat-section";
import { validateCategoryRules } from "@/lib/category-validation";
import { consumeQuotaAction } from "@/app/actions-quotas";

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
    const [initialCategory, setInitialCategory] = useState<DanceCategory | null>(null);
    const [responsibles, setResponsibles] = useState<RegistrationResponsible[]>([
        { name: "", surnames: "", phone: "", email: "" }
    ]);
    const [participants, setParticipants] = useState<RegistrationParticipant[]>([]);
    const [paymentProofUrls, setPaymentProofUrls] = useState<string[]>([]);
    const [musicFileUrl, setMusicFileUrl] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<'draft' | 'submitted' | 'submitted_modifiable'>('draft');

    // File States (Local only, not saved to DB until upload)
    const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
    const [musicFile, setMusicFile] = useState<File | null>(null);
    const [participantFiles, setParticipantFiles] = useState<{
        [key: number]: {
            authorization: File[],
            dni: File[],
            authorizedDni: File[]
        }
    }>({});

    const [responsibleDniFiles, setResponsibleDniFiles] = useState<{ [key: number]: File[] }>({}); // Changed to File[]

    const [registrationEnabled, setRegistrationEnabled] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        const checkSettings = async () => {
            const { data } = await supabase
                .from('app_settings')
                .select('group_registration_enabled')
                .eq('id', 1)
                .single();

            if (data) setRegistrationEnabled(data.group_registration_enabled);
            setCheckingStatus(false);
        };
        checkSettings();
    }, []);

    // BLOCK REGISTRATION IF DISABLED AND NOT EDITING
    // Allow editing existing registration (id param exists) even if closed, normally. 
    // But since user wants to "capar por ahora", maybe we block everything unless enabled?
    // Let's stick to: If disabled, BLOCK NEW. If ID exists, we can allow (assuming user has link or prev access). 
    // BUT user said "capar...". Let's block ALL for now unless `group_registration_enabled` is true.

    // Access control moved below hooks

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login?redirect=/registration" + (registrationIdParam ? `?id=${registrationIdParam}` : ""));
                return;
            }
            setUserId(user.id);

            // Fetch profile for school name
            const { data: profile } = await supabase
                .from('profiles')
                .select('school_name')
                .eq('id', user.id)
                .single();

            if (profile && profile.school_name && !registrationIdParam) {
                setSchoolName(profile.school_name);
            }

            if (registrationIdParam) {
                loadRegistration(registrationIdParam);
            } else {
                setLoading(false);
            }
        };

        checkAuth();
    }, [registrationIdParam, router]);

    if (!checkingStatus && !registrationEnabled) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Loader2 className="w-10 h-10 text-[var(--primary)]" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter uppercase">
                    Inscripciones <br />
                    <span className="text-[var(--primary)]">Próximamente</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-lg mb-8">
                    Las inscripciones se abrirán el <strong>8 de Febrero</strong>.
                    <br />Mientras tanto, puedes completar tu perfil de usuario.
                </p>
                <Link href="/dashboard" className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all">
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    const loadRegistration = async (id: string | null) => {
        if (!id) return;
        try {
            // Load core registration
            const { data: reg, error: regErr } = await supabase
                .from('registrations')
                .select('*')
                .eq('id', id)
                .single();

            if (regErr || !reg) {
                console.error("Error loading registration:", regErr);
                alert("Error cargando inscripción");
                return;
            }

            // Mark Admin messages as read
            const { markAdminMessagesAsRead } = await import("@/app/actions-chat");
            markAdminMessagesAsRead(id);


            setGroupName(reg.group_name || "");
            setSchoolName(reg.school_name || "");
            setCategory(reg.category || "Absoluta");
            setInitialCategory(reg.category || null);
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

    const handleCategoryChange = (newCategory: DanceCategory) => {
        const closedCategories = [
            "Infantil", "Infantil Mini-parejas", "Mini-Solistas Infantil",
            "Junior", "Junior Mini-parejas", "Mini-Solistas Junior",
            "Absoluta", "Parejas", "Solistas Absoluta"
        ];
        if (closedCategories.includes(newCategory) && initialCategory !== newCategory) {
            alert("Hemos cerrado las inscripciones de las categorias del Bloque 1, Bloque 2 y Bloque 4 (excepto Premium). Hemos llenado el cupo de grupos. Disculpar por las molestias.");
            return;
        }
        setCategory(newCategory);
    };

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

        const newFiles = { ...participantFiles };
        delete newFiles[index];
        setParticipantFiles(newFiles);
    };

    const updateParticipant = (index: number, field: keyof RegistrationParticipant, value: any) => {
        const newList = [...participants];
        newList[index] = { ...newList[index], [field]: value };
        setParticipants(newList);
    };

    const handleParticipantFilesChange = (index: number, type: 'authorization' | 'dni' | 'authorizedDni', newFiles: FileList | null) => {
        if (!newFiles) return;
        setParticipantFiles(prev => {
            const participantData = prev[index] || { authorization: [], dni: [], authorizedDni: [] };
            const existingFiles = participantData[type] || [];

            return {
                ...prev,
                [index]: {
                    ...participantData,
                    [type]: [...existingFiles, ...Array.from(newFiles)]
                }
            };
        });
    };

    const removeParticipantFile = (participantIndex: number, type: 'authorization' | 'dni' | 'authorizedDni', fileIndex: number) => {
        setParticipantFiles(prev => {
            const participantData = prev[participantIndex];
            if (!participantData) return prev;

            const newFiles = participantData[type].filter((_, i) => i !== fileIndex);

            return {
                ...prev,
                [participantIndex]: {
                    ...participantData,
                    [type]: newFiles
                }
            };
        });
    };

    const handleResponsibleDniFileChange = (index: number, newFiles: FileList | null) => {
        if (!newFiles) return;
        setResponsibleDniFiles(prev => {
            const existing = prev[index] || [];
            return { ...prev, [index]: [...existing, ...Array.from(newFiles)] };
        });
    };

    const removeResponsibleDniFile = (responsibleIndex: number, fileIndex: number) => {
        setResponsibleDniFiles(prev => {
            const files = prev[responsibleIndex] || [];
            const newFiles = files.filter((_, i) => i !== fileIndex);
            return { ...prev, [responsibleIndex]: newFiles };
        });
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
                user_id: userId,
                updated_at: new Date().toISOString()
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
                // Update URL properly using Next.js router so it persists across soft navigations/revalidations
                router.replace(`/registration?id=${newReg.id}`);
            }

            // 3. Upsert Responsibles
            const { error: delRespErr } = await supabase.from('registration_responsibles').delete().eq('registration_id', currentRegId);
            if (delRespErr) throw delRespErr;

            if (responsibles.length > 0) {
                const responsiblesWithFiles = await Promise.all(responsibles.map(async (r, idx) => {
                    // Upload new files
                    const newDniUrls: string[] = [];
                    if (responsibleDniFiles[idx]) {
                        for (const file of responsibleDniFiles[idx]) {
                            const url = await uploadFile(file, 'dnis');
                            newDniUrls.push(url);
                        }
                    }

                    // Combine with existing URLs (if we had a way to remove individual existing URLs, we'd handle it here. 
                    // For now assuming r.dni_urls contains the source of truth for existing ones, which we haven't implemented UI for removal of existing yet perfectly, 
                    // but let's assume we just append new ones or replace if logic demands. 
                    // The prompt asked for uploading multiple files. 
                    // Let's concat new URLs to existing ones if they exist.
                    const existingUrls = r.dni_urls || [];
                    // Note: If we supported removal of existing URLs in UI, we would have updated `responsibles` state.
                    // Assuming adding indiscriminately for now as per "upload multiple".

                    const finalDniUrls = [...existingUrls, ...newDniUrls];

                    const { id, ...rest } = r;
                    return { ...rest, registration_id: currentRegId, dni_urls: finalDniUrls };
                }));

                const { error: respErr } = await supabase
                    .from('registration_responsibles')
                    .insert(responsiblesWithFiles);
                if (respErr) throw respErr;
            }

            // 4. Upsert Participants
            // 4. Upsert Participants
            const participantsWithUrls = await Promise.all(participants.map(async (p, idx) => {
                const participantUploads = participantFiles[idx] || { authorization: [], dni: [], authorizedDni: [] };

                // Helper to upload list of files
                const uploadList = async (files: File[], folder: string) => {
                    const urls: string[] = [];
                    for (const file of files) {
                        const url = await uploadFile(file, folder);
                        urls.push(url);
                    }
                    return urls;
                };

                // Upload new files
                const newAuthUrls = await uploadList(participantUploads.authorization || [], 'participants/auth');
                const newDniUrls = await uploadList(participantUploads.dni || [], 'participants/dni');
                const newAuthDniUrls = await uploadList(participantUploads.authorizedDni || [], 'participants/auth_dni');

                // Combine with existing (preserving previous URLs)
                const finalAuthUrls = [...(p.authorization_urls || []), ...newAuthUrls];
                const finalDniUrls = [...(p.dni_urls || []), ...newDniUrls];
                const finalAuthDniUrls = [...(p.authorized_dni_urls || []), ...newAuthDniUrls];

                // Fix for invalid input syntax for type date: ""
                const dob = p.dob === "" ? null : p.dob;

                const { id, authorization_url, dni_url, tutor_dni_url, file_urls, ...rest } = p;

                return {
                    ...rest,
                    dob,
                    registration_id: currentRegId,
                    authorization_urls: finalAuthUrls,
                    dni_urls: finalDniUrls,
                    authorized_dni_urls: finalAuthDniUrls
                };
            }));

            const { error: delPartErr } = await supabase.from('registration_participants').delete().eq('registration_id', currentRegId);
            if (delPartErr) throw delPartErr;
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
                setParticipantFiles({});
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

    // --- Validation Logic ---

    const validateRegistration = (): boolean => {
        const result = validateCategoryRules(category, participants);

        if (!result.isValid) {
            // Auto-promotion logic if suggested
            if (result.details?.suggestedCategory) {
                const nextCategory = result.details.suggestedCategory;

                const closedCategories = [
                    "Infantil", "Infantil Mini-parejas", "Mini-Solistas Infantil",
                    "Junior", "Junior Mini-parejas", "Mini-Solistas Junior",
                    "Absoluta", "Parejas", "Solistas Absoluta"
                ];
                if (closedCategories.includes(nextCategory as any) && initialCategory !== nextCategory) {
                    setError(`No se puede reasignar automáticamente a la categoría superior (${nextCategory}) porque hemos cerrado las inscripciones de estas categorías. El cupo de grupos del Bloque 1, Bloque 2 y Bloque 4 (excepto Premium) está lleno. Revisa las fechas de nacimiento.`);
                    return false;
                }

                setCategory(nextCategory);

                // Format invalid participants list for the message
                const invalidNames = result.details.invalidParticipants
                    .map(p => `${p.name} (${new Date(p.dob).getFullYear()})`)
                    .join(", ");

                setError(
                    `Atención: ${result.details.percentage.toFixed(1)}% de los participantes cumplen con la edad de ${category} (Mínimo 75%).
                    
                    Participantes fuera de rango: ${invalidNames}
                    
                    El grupo ha sido reasignado automáticamente a la categoría superior: ${nextCategory}. 
                    
                    Por favor, revisa y vuelve a enviar si estás de acuerdo.`
                );
            } else {
                // Hard error
                if (result.details?.invalidParticipants) {
                    const invalidNames = result.details.invalidParticipants
                        .map(p => `${p.name} (${new Date(p.dob).getFullYear()})`)
                        .join(", ");

                    setError(`${result.error}
                    
                    Participantes fuera de rango: ${invalidNames}
                    
                    Revisa las fechas de nacimiento o cambia la categoría manualmente.`);
                } else {
                    setError(result.error || "Error de validación desconocido.");
                }
            }
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
        setError(null);

        // 1. Logic Validation (Ages, Counts)
        if (!validateRegistration()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // 2. Data Validation
        if (paymentFiles.length === 0 && paymentProofUrls.length === 0) {
            setError("Por favor, sube el justificante de pago para finalizar.");
            return;
        }

        // 3. Confirm
        if (!confirm("¿Estás seguro de que quieres enviar la inscripción definitiva? No podrás modificarla después.")) {
            return;
        }

        setSubmitting(true);

        // 4. Global Registration Deadline Check (March 2nd, 2026 00:00 = UTC Time: 2026-03-01T23:00:00Z)
        // We use March 2nd CET (Europe/Madrid) as the cutoff
        const now = new Date();
        const cutoffDate = new Date('2026-03-01T23:00:00Z'); // 00:00 in Spain is 23:00 the day before in UTC

        if (now >= cutoffDate) {
            // It is past the deadline. Check for explicitly opened quotas.
            const quotaRes = await consumeQuotaAction(category);

            if (!quotaRes.success || !quotaRes.allowed) {
                setSubmitting(false);
                setError("El plazo general de inscripción ha terminado. No hay plazas extraordinarias abiertas actualmente para la categoría " + category + ".");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            // If quotaRes.allowed is true, the quota was successfully consumed, so we let the submit proceed.
        }

        await saveToDB('submitted');
        setSubmitting(false);
    };


    const handleDeleteFile = async (
        type: 'responsible_dni' | 'participant_auth' | 'participant_dni' | 'participant_auth_dni' | 'music' | 'payment',
        index: number, // responsible index or participant index
        fileIndex: number, // index in the url array
        fileUrl: string
    ) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este archivo permanentemente?")) return;

        // 1. Delete from Storage
        try {
            // Determine bucket and path
            let bucket = 'uploads';
            let path = '';

            if (fileUrl.includes('/uploads/')) {
                const parts = fileUrl.split('/uploads/');
                if (parts.length >= 2) path = parts[1];
            } else if (fileUrl.includes('/documents/')) {
                bucket = 'documents';
                const parts = fileUrl.split('/documents/');
                if (parts.length >= 2) path = parts[1];
            }

            // Fallback or error if path not found
            if (!path) {
                // Try decoding URI component just in case
                try {
                    const decoded = decodeURIComponent(fileUrl);
                    if (decoded.includes('/uploads/')) {
                        bucket = 'uploads';
                        const parts = decoded.split('/uploads/');
                        if (parts.length >= 2) path = parts[1];
                    } else if (decoded.includes('/documents/')) {
                        bucket = 'documents';
                        const parts = decoded.split('/documents/');
                        if (parts.length >= 2) path = parts[1];
                    }
                } catch (e) { }
            }

            if (!path) throw new Error("No se pudo determinar la ruta del archivo");


            const { deleteFileAction } = await import('@/app/actions');
            const result = await deleteFileAction(path, bucket);

            if (!result.success) throw new Error(result.message);

            // 2. Update Local State
            if (type === 'responsible_dni') {
                const newResponsibles = [...responsibles];
                const urls = [...(newResponsibles[index].dni_urls || [])];
                urls.splice(fileIndex, 1);
                newResponsibles[index].dni_urls = urls;
                setResponsibles(newResponsibles);
            } else if (type === 'music') {
                setMusicFileUrl(null);
                // Also clear the file input if possible, but state is key
            } else if (type === 'payment') {
                // Remove from array
                const newUrls = [...paymentProofUrls];
                newUrls.splice(fileIndex, 1);
                setPaymentProofUrls(newUrls);
            } else {
                // Participants
                const newParticipants = [...participants];
                let urls: string[] = [];

                if (type === 'participant_auth') urls = [...(newParticipants[index].authorization_urls || [])];
                if (type === 'participant_dni') urls = [...(newParticipants[index].dni_urls || [])];
                if (type === 'participant_auth_dni') urls = [...(newParticipants[index].authorized_dni_urls || [])];

                urls.splice(fileIndex, 1);

                if (type === 'participant_auth') newParticipants[index].authorization_urls = urls;
                if (type === 'participant_dni') newParticipants[index].dni_urls = urls;
                if (type === 'participant_auth_dni') newParticipants[index].authorized_dni_urls = urls;

                setParticipants(newParticipants);
            }

        } catch (e: any) {
            console.error(e);
            alert("Error al eliminar el archivo: " + e.message);
        }
    };


    // Helper to render existing file list with delete
    const renderExistingFiles = (urls: string[] | undefined, type: 'responsible_dni' | 'participant_auth' | 'participant_dni' | 'participant_auth_dni', parentIndex: number) => {
        if (!urls || urls.length === 0) return null;
        return (
            <div className="flex flex-col gap-1 mt-1">
                {urls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 px-2 py-1 rounded text-xs gap-2">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate flex-1">
                            Ver Archivo {i + 1}
                        </a>
                        {(status === 'draft' || status === 'submitted_modifiable') && (
                            <button
                                type="button"
                                onClick={() => handleDeleteFile(type, parentIndex, i, url)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Eliminar archivo"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
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
                <form id="registration-form" onSubmit={handleSubmit} className="w-full">
                    <fieldset disabled={status === 'submitted'} className="flex flex-col gap-16 border-none min-w-0">
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
                                    <label className="text-sm font-medium text-gray-400">Categoría</label>
                                    <select
                                        className="w-full bg-neutral-900 border border-white/10 rounded-lg p-3 focus:border-[var(--primary)] outline-none"
                                        value={category}
                                        onChange={e => handleCategoryChange(e.target.value as DanceCategory)}
                                    >
                                        <optgroup label="Mañana Bloque 1">
                                            <option value="Infantil">Infantil (nacidos 2014 y posterior)</option>
                                            <option value="Infantil Mini-parejas">Infantil Mini-parejas (nacidos 2014 y posterior)</option>
                                            <option value="Mini-Solistas Infantil">Mini-Solistas Infantil (nacidos 2014 y posterior)</option>
                                        </optgroup>
                                        <optgroup label="Mañana Bloque 2">
                                            <option value="Junior">Junior (nacidos 2011-2013)</option>
                                            <option value="Junior Mini-parejas">Junior Mini-parejas (nacidos 2011-2013)</option>
                                            <option value="Mini-Solistas Junior">Mini-Solistas Junior (nacidos 2011-2013)</option>
                                        </optgroup>
                                        <optgroup label="Tarde Bloque 3">
                                            <option value="Juvenil">Juvenil (nacidos 2009-2010)</option>
                                            <option value="Juvenil Parejas">Juvenil Parejas (nacidos 2009-2010)</option>
                                            <option value="Solistas Juvenil">Solistas Juvenil (nacidos 2009-2010)</option>
                                        </optgroup>
                                        <optgroup label="Tarde Bloque 4">
                                            <option value="Absoluta">Absoluta (nacidos 2008 y anterior)</option>
                                            <option value="Parejas">Parejas (nacidos 2008 y anterior)</option>
                                            <option value="Solistas Absoluta">Solistas Absoluta (nacidos 2008 y anterior)</option>
                                            <option value="Premium">Premium (nacidos 1995 y anterior)</option>
                                        </optgroup>

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
                                                    <div className={`p-2 rounded-lg border border-dashed transition-all ${responsibleDniFiles[idx]?.length > 0 || (resp.dni_urls && resp.dni_urls.length > 0) ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-white/20 text-gray-400 group-hover/dni:border-white/40 group-hover/dni:text-white'}`}>
                                                        <CreditCard size={18} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-gray-300">
                                                            DNI
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        onChange={(e) => handleResponsibleDniFileChange(idx, e.target.files)}
                                                    />
                                                </label>

                                                {/* File List for Responsible DNI */}
                                                <div className="mt-2 space-y-1">
                                                    {/* Existing URLs */}
                                                    {renderExistingFiles(resp.dni_urls, 'responsible_dni', idx)}

                                                    {/* Pending Uploads */}
                                                    {responsibleDniFiles[idx] && responsibleDniFiles[idx].map((file, fIdx) => (
                                                        <div key={`new-${fIdx}`} className="flex items-center justify-between bg-white/5 px-2 py-1 rounded text-xs">
                                                            <span className="text-gray-300 truncate flex-1">{file.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeResponsibleDniFile(idx, fIdx)}
                                                                className="text-gray-500 hover:text-red-500 ml-2"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
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
                                                <th className="p-4 font-medium text-center">Documentación</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {participants.map((p, idx) => (
                                                <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                                    <td className="p-4 space-y-2 align-top w-[35%]">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1">Nombre</span>
                                                                <input
                                                                    required
                                                                    placeholder="Nombre"
                                                                    className="w-full bg-neutral-900 border border-white/10 p-2 rounded focus:border-[var(--primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors placeholder:text-gray-600"
                                                                    value={p.name}
                                                                    onChange={e => updateParticipant(idx, 'name', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1">Apellidos</span>
                                                                <input
                                                                    required
                                                                    placeholder="Apellidos"
                                                                    className="w-full bg-neutral-900 border border-white/10 p-2 rounded focus:border-[var(--primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors placeholder:text-gray-600"
                                                                    value={p.surnames}
                                                                    onChange={e => updateParticipant(idx, 'surnames', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pl-1">Fecha Nacimiento</span>
                                                            <input
                                                                required
                                                                type="date"
                                                                className="w-full bg-neutral-900 border border-white/10 p-2 rounded focus:border-[var(--primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] [color-scheme:dark] text-sm transition-colors text-gray-300"
                                                                value={p.dob}
                                                                onChange={e => updateParticipant(idx, 'dob', e.target.value)}
                                                            />
                                                        </div>
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
                                                        <div className="flex flex-col gap-4">

                                                            {/* 1. AUTORIZACIÓN */}
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Autorización</p>
                                                                {/* Existing */}
                                                                {renderExistingFiles(p.authorization_urls, 'participant_auth', idx)}
                                                                {/* Pending */}
                                                                {participantFiles[idx]?.authorization?.map((file, fIdx) => (
                                                                    <div key={`auth-new-${fIdx}`} className="flex items-center justify-between bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 mb-1">
                                                                        <span className="text-[10px] truncate max-w-[80px] text-blue-200">{file.name}</span>
                                                                        <button type="button" onClick={() => removeParticipantFile(idx, 'authorization', fIdx)} className="text-red-400 hover:text-red-300">
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <label className="cursor-pointer inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded text-[10px] transition-colors">
                                                                    <Upload size={10} className="text-[var(--primary)]" />
                                                                    <span>Añadir</span>
                                                                    <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleParticipantFilesChange(idx, 'authorization', e.target.files)} />
                                                                </label>
                                                            </div>

                                                            {/* 2. DNI */}
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">DNI</p>
                                                                {/* Existing */}
                                                                {renderExistingFiles(p.dni_urls, 'participant_dni', idx)}
                                                                {/* Pending */}
                                                                {participantFiles[idx]?.dni?.map((file, fIdx) => (
                                                                    <div key={`dni-new-${fIdx}`} className="flex items-center justify-between bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 mb-1">
                                                                        <span className="text-[10px] truncate max-w-[80px] text-blue-200">{file.name}</span>
                                                                        <button type="button" onClick={() => removeParticipantFile(idx, 'dni', fIdx)} className="text-red-400 hover:text-red-300">
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <label className="cursor-pointer inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded text-[10px] transition-colors">
                                                                    <Upload size={10} className="text-[var(--primary)]" />
                                                                    <span>Añadir</span>
                                                                    <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleParticipantFilesChange(idx, 'dni', e.target.files)} />
                                                                </label>
                                                            </div>

                                                            {/* 3. DNI AUTORIZADO */}
                                                            <div>
                                                                <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">DNI Autorizante</p>
                                                                {/* Existing */}
                                                                {renderExistingFiles(p.authorized_dni_urls, 'participant_auth_dni', idx)}
                                                                {/* Pending */}
                                                                {participantFiles[idx]?.authorizedDni?.map((file, fIdx) => (
                                                                    <div key={`authdni-new-${fIdx}`} className="flex items-center justify-between bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 mb-1">
                                                                        <span className="text-[10px] truncate max-w-[80px] text-blue-200">{file.name}</span>
                                                                        <button type="button" onClick={() => removeParticipantFile(idx, 'authorizedDni', fIdx)} className="text-red-400 hover:text-red-300">
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <label className="cursor-pointer inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded text-[10px] transition-colors">
                                                                    <Upload size={10} className="text-[var(--primary)]" />
                                                                    <span>Añadir</span>
                                                                    <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleParticipantFilesChange(idx, 'authorizedDni', e.target.files)} />
                                                                </label>
                                                            </div>

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
                                        Sube el archivo de audio que se utilizará durante la actuación.
                                        <br />Asegúrate de que la calidad sea buena y que corresponda con la versión final.
                                    </p>
                                </div>

                                <div className="mt-6 md:mt-0 md:w-1/3">
                                    <label className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all ${musicFile || musicFileUrl ? 'border-pink-500 bg-pink-500/5' : 'border-white/20'}`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                            {musicFile || musicFileUrl ? (
                                                <>
                                                    <Music className="w-8 h-8 text-pink-500 mb-2" />
                                                    <p className="text-xs text-gray-300 font-medium truncate w-full">
                                                        {musicFile ? musicFile.name : "Música subida ✓"}
                                                    </p>
                                                    <p className="text-[10px] text-pink-500 mt-1 font-bold">Cambiar archivo</p>
                                                    {musicFileUrl && (status === 'draft' || status === 'submitted_modifiable') && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleDeleteFile('music', 0, 0, musicFileUrl);
                                                            }}
                                                            className="absolute top-2 right-2 bg-red-500/20 text-red-400 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors z-20"
                                                            title="Eliminar música"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-400 font-medium tracking-tight">Subir Música</p>
                                                    <p className="text-[10px] text-gray-500 mt-1">Archivo de Audio</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setMusicFile(file);
                                                }
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
                                        Por favor, realiza los pagos correspondientes (uno para la inscripción y otro para las entradas) y sube aquí los justificantes.
                                    </p>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl space-y-3">
                                        <div>
                                            <p className="text-yellow-200 text-sm font-medium">🔔 IMPORTANTE: CONCEPTO</p>
                                            <p className="text-yellow-100/80 text-sm mt-1">
                                                En el concepto de la transferencia debes poner: <br />
                                                <strong className="text-white">"Nombre Grupo + Inscripciones" y "Nombre Grupo + Entradas"</strong>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-yellow-200 text-sm font-medium">🏦 NÚMERO DE CUENTA</p>
                                            <p className="text-yellow-100/80 text-sm mt-1 font-mono select-all">
                                                ES24 0073 0100 5107 0293 5118
                                            </p>
                                        </div>
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
                                                    <button type="button" onClick={() => handleDeleteFile('payment', 0, idx, url)} className="text-gray-500 hover:text-red-500">
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
                    </fieldset>
                </form >

                <div className="space-y-12 mt-24 md:max-w-4xl mx-auto">
                    {/* SECTION 6: NOTES / CHAT 
                        Moved OUTSIDE the main form to prevent nested form issues (which caused page reloads).
                    */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 text-[var(--primary)]">
                            <MessageSquare className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Comunicación</h2>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Te contestaremos lo antes posible, gracias por vuestra paciencia.
                        </p>

                        {registrationId ? (
                            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
                                <ChatSection registrationId={registrationId} currentUserRole="user" />
                            </div>
                        ) : (
                            <div className="bg-neutral-900 border border-white/10 p-8 rounded-2xl text-center">
                                <p className="text-gray-400">Guarda la inscripción al menos como borrador para poder iniciar el chat con la organización.</p>
                            </div>
                        )}
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
                            disabled={savingDraft || submitting || status === 'submitted'}
                            className="flex-1 sm:hidden bg-white/5 text-white font-bold py-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {savingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            GUARDAR BORRADOR
                        </button>

                        <button
                            type="submit"
                            form="registration-form"
                            disabled={submitting || savingDraft || status === 'submitted'}
                            className="flex-[2] bg-[var(--primary)] text-white text-xl font-black py-6 rounded-2xl shadow-[0_0_30px_rgba(255,0,204,0.4)] hover:shadow-[0_0_50px_rgba(255,0,204,0.6)] hover:bg-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {submitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                            {status === 'submitted' ? 'INSCRIPCIÓN ENVIADA' : (submitting ? 'ENVIANDO...' : 'ENVIAR INSCRIPCIÓN DEFINITIVA')}
                        </button>
                    </div>
                </div>
            </main >
        </div >
    );
}

export default function RegistrationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[var(--primary)]" /></div>}>
            <RegistrationForm />
        </Suspense>
    );
}
