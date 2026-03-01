"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Building, Download, RefreshCw, Trash2, Gavel, Lock, LayoutDashboard, FileText, X, Eye, Ticket, Calendar, Search, Check, Clock, AlertTriangle, Building2, Mail, Phone, Music, ChevronLeft, Filter, MoreVertical, CheckCircle2, XCircle, User as UserIcon, Unlock, ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, Send, ArrowRight, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
    deleteRegistration, resetApplicationData, toggleSchoolApproval, getAllRegistrationsAction,
    getRegistrationDetailsAction,
    getSchoolRegistrationsAction,
    getSchoolTicketsAction,
    getSchoolsStatsAction,
    toggleRegistrationConfirmation, togglePaymentVerification, updateRegistrationCategory, updateMusicStatus, toggleGroupRegistrationAction, updateParticipantTickets, updateMusicUrl, updateRegistrationNotes, updateRegistrationStatus
} from "@/app/actions-admin";
import { getUnreadStats, markMessagesAsRead } from "@/app/actions-chat";
import { ChatSection } from "@/components/chat-section";
import AdminJudgesManager from "@/components/admin-judges-manager";
import AdminFAQManager from "@/components/admin-faq-manager";
// import AdminCouponManager from "@/components/admin-coupon-manager"; // Removed as requested
import AdminSeatingManager from "@/components/admin-seating-manager";
import { Registration } from "@/types";
import { AdminSidebarNotificationBadge } from "@/components/admin/notification-badge";
import dynamic from "next/dynamic";
import AdminQuotasManager from "@/components/admin-quotas-manager";

const PDFExportButton = dynamic(
    () => import("@/components/pdf/PDFExportButton").then((mod) => mod.PDFExportButton),
    { ssr: false }
);

const RegistrationPDFButton = dynamic(
    () => import("@/components/pdf/RegistrationPDFButton").then((mod) => mod.RegistrationPDFButton),
    { ssr: false }
);

const SchoolTicketsPDFButton = dynamic(
    () => import("@/components/pdf/SchoolTicketsPDFButton").then((mod) => mod.SchoolTicketsPDFButton),
    { ssr: false, loading: () => <div className="bg-blue-600/50 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-wait"><Ticket size={18} />Cargando...</div> }
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
    const [activeTab, setActiveTab] = useState<'registrations' | 'sales' | 'schools' | 'config' | 'judges' | 'faq' | 'seating' | 'quotas'>('registrations');
    const [groupRegistrationEnabled, setGroupRegistrationEnabled] = useState(false);
    const [publicSalesEnabled, setPublicSalesEnabled] = useState(false);

    // ... (existing state)

    // ... (fetchSettings modification)
    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from('app_settings')
            .select('public_sales_enabled, group_registration_enabled')
            .eq('id', 1)
            .single();

        if (data) {
            setPublicSalesEnabled(data.public_sales_enabled);
            setGroupRegistrationEnabled(data.group_registration_enabled);
        }
    };

    // ... (toggle function)
    const toggleGroupRegistration = async () => {
        // Optimistic update
        const newValue = !groupRegistrationEnabled;
        setGroupRegistrationEnabled(newValue);

        // Import dynamically to avoid top-level issues if not imported
        const { toggleGroupRegistrationAction } = await import('@/app/actions-admin');
        const result = await toggleGroupRegistrationAction(newValue);

        if (!result.success) {
            // Revert on error
            setGroupRegistrationEnabled(!newValue);
            alert("Error: " + result.error);
        }
    };

    // ... (render modification in header)



    const [isResetting, setIsResetting] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [zipStatus, setZipStatus] = useState<string>("");

    // Notification State
    const [unreadStats, setUnreadStats] = useState<{ total: number, counts: Record<string, number> }>({ total: 0, counts: {} });

    // Sort State
    const [sortConfigs, setSortConfigs] = useState<{ key: string, direction: 'asc' | 'desc' }[]>([]);

    // School View State
    const [schools, setSchools] = useState<any[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
    const [schoolRegistrations, setSchoolRegistrations] = useState<any[]>([]);
    const [schoolTickets, setSchoolTickets] = useState<any[]>([]); // New state
    const [schoolSort, setSchoolSort] = useState<string>('created_at');
    const [schoolSortOrder, setSchoolSortOrder] = useState<'asc' | 'desc'>('desc');

    // --- Authentication ---

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "2026") {
            setIsAuthenticated(true);
            fetchRegistrations();
            fetchSettings();
            fetchSchools(); // Pre-fetch schools on login too
            fetchNotifications(); // Initial fetch
        } else {
            setError("Código incorrecto");
        }
    };

    // --- Data Fetching ---



    const fetchNotifications = async () => {
        const res = await getUnreadStats();
        if (res.success) {
            setUnreadStats({
                total: res.total || 0,
                counts: res.data || {}
            });
        }
    };

    // Poll for notifications
    useEffect(() => {
        if (isAuthenticated) {
            const interval = setInterval(fetchNotifications, 15000); // Check every 15s
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

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
            const result = await getAllRegistrationsAction();

            if (!result.success || !result.data) throw new Error(result.error);
            const data = result.data;

            // Map profile.school_name to flat school_name for table
            // Priority: Profile Name > Registration Snapshot Name > Unknown
            const formattedData = data?.map((reg: any) => ({
                ...reg,
                school_name: reg.profiles?.school_name || reg.school_name || "Desconocida"
            })) || [];

            setRegistrations(formattedData);
        } catch (err) {
            console.error("Error fetching registrations:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRegistrationDetails = async (id: string) => {
        try {
            const result = await getRegistrationDetailsAction(id);
            if (!result.success || !result.data) throw new Error(result.error);
            setSelectedRegistration(result.data);

            // Mark messages as read when opening details
            await markMessagesAsRead(id);
            // Refresh stats to clear badge
            fetchNotifications();

        } catch (err) {
            console.error("Error fetching details:", err);
        }
    };

    // ... (rest of functions: handleResetData, fetchSchools, etc. unchanged)

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


    const handleDownloadZip = async (registration: any) => {
        console.log("Starting ZIP download for:", registration.id);
        setIsZipping(true);
        setZipStatus("Iniciando análisis de archivos...");
        let successCount = 0;
        let errorCount = 0;
        const fileCounts = {
            pdf: 0,
            music: 0,
            payment: 0,
            part_dni: 0,
            part_auth: 0,
            part_auth_dni: 0,
            resp_dni: 0
        };

        try {
            const zip = new JSZip();
            // Sanitize names for folder
            const saneGroup = (registration.group_name || 'Grupo').replace(/[^a-z0-9]/gi, '_');
            const saneCat = (registration.category || 'Cat').replace(/[^a-z0-9]/gi, '_');
            const folderName = `${saneGroup}_${saneCat}`;

            const root = zip.folder(folderName);
            if (!root) throw new Error("Could not create zip folder");

            // 1. Generate PDF
            // We use the same component as the PDFDownloadLink
            try {
                const { pdf } = await import("@react-pdf/renderer");
                const { RegistrationDocument } = await import("@/components/pdf/RegistrationDocument");
                const blob = await pdf(<RegistrationDocument registration={registration} />).toBlob();
                root.file(`Ficha_Inscripcion_${registration.id.slice(0, 8)}.pdf`, blob);
                fileCounts.pdf++;
                successCount++;
                setZipStatus("PDF generado. Buscando otros archivos...");
            } catch (pdfErr) {
                console.error("Error generating PDF for zip:", pdfErr);
                root.file("ERROR_PDF.txt", "No se pudo generar el PDF.");
                errorCount++;
            }

            // Helper to fetch and add
            const fetchAndAdd = async (url: string, path: string) => {
                if (!url) return;
                try {
                    const res = await fetch(url, { cache: 'force-cache' }); // Try cache first? or no-store? 'no-store' is safer for freshness but 'force-cache' might avoid network errors if cached. Let's use default but handle errors.
                    if (!res.ok) throw new Error(`Status ${res.status}`);
                    const blob = await res.blob();
                    root.file(path, blob);
                    successCount++;
                } catch (e: any) {
                    console.error(`Error downloading ${url}:`, e);
                    root.file(`${path}.txt`, `Error descarga: ${url} - ${e.message}`);
                    errorCount++;
                }
            };

            const promises: Promise<void>[] = [];

            // 2. Music
            if (registration.music_file_url) {
                const ext = registration.music_file_url.split('.').pop()?.split('?')[0] || 'mp3';
                promises.push(fetchAndAdd(registration.music_file_url, `Musica/${saneGroup}_${saneCat}.${ext}`));
                fileCounts.music++;
            }

            // 3. Payment Proofs
            if (registration.payment_proof_urls && registration.payment_proof_urls.length > 0) {
                registration.payment_proof_urls.forEach((url: string, i: number) => {
                    const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                    promises.push(fetchAndAdd(url, `Pagos/Justificante_${i + 1}.${ext}`));
                    fileCounts.payment++;
                });
            } else if (registration.payment_proof_url) {
                const ext = registration.payment_proof_url.split('.').pop()?.split('?')[0] || 'pdf';
                promises.push(fetchAndAdd(registration.payment_proof_url, `Pagos/Justificante.${ext}`));
                fileCounts.payment++;
            }

            // 4. Participants Docs
            if (registration.registration_participants) {
                registration.registration_participants.forEach((p: any, i: number) => {
                    const pName = `${p.name}_${p.surnames}`.replace(/[^a-z0-9]/gi, '_');
                    const pFolder = `Participantes/${(i + 1).toString().padStart(2, '0')}_${pName}`;

                    // DNI URLs
                    if (p.dni_urls && p.dni_urls.length > 0) {
                        p.dni_urls.forEach((url: string, j: number) => {
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            promises.push(fetchAndAdd(url, `${pFolder}/DNI_${j + 1}.${ext}`));
                            fileCounts.part_dni++;
                        });
                    } else if (p.dni_url) {
                        const ext = p.dni_url.split('.').pop()?.split('?')[0] || 'pdf';
                        promises.push(fetchAndAdd(p.dni_url, `${pFolder}/DNI.${ext}`));
                        fileCounts.part_dni++;
                    }

                    // Auth URLs
                    if (p.authorization_urls && p.authorization_urls.length > 0) {
                        p.authorization_urls.forEach((url: string, j: number) => {
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            promises.push(fetchAndAdd(url, `${pFolder}/Autorizacion_${j + 1}.${ext}`));
                            fileCounts.part_auth++;
                        });
                    } else if (p.authorization_url) {
                        const ext = p.authorization_url.split('.').pop()?.split('?')[0] || 'pdf';
                        promises.push(fetchAndAdd(p.authorization_url, `${pFolder}/Autorizacion.${ext}`));
                        fileCounts.part_auth++;
                    }

                    // Tutor DNI (Legacy only?)
                    if (p.tutor_dni_url) {
                        const ext = p.tutor_dni_url.split('.').pop()?.split('?')[0] || 'pdf';
                        promises.push(fetchAndAdd(p.tutor_dni_url, `${pFolder}/DNI_Autorizante_Legacy.${ext}`));
                        fileCounts.part_auth_dni++;
                    }
                    if (p.authorized_dni_urls && p.authorized_dni_urls.length > 0) {
                        p.authorized_dni_urls.forEach((url: string, j: number) => {
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            promises.push(fetchAndAdd(url, `${pFolder}/DNI_Autorizante_${j + 1}.${ext}`));
                            fileCounts.part_auth_dni++;
                        });
                    }

                    // Generic Files
                    if (p.file_urls && p.file_urls.length > 0) {
                        p.file_urls.forEach((url: string, j: number) => {
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            promises.push(fetchAndAdd(url, `${pFolder}/DocExtra_${j + 1}.${ext}`));
                        });
                    }
                });
            }

            // Responsibles DNI
            if (registration.registration_responsibles) {
                registration.registration_responsibles.forEach((r: any, i: number) => {
                    const rName = `${r.name}_${r.surnames}`.replace(/[^a-z0-9]/gi, '_');
                    if (r.dni_urls && r.dni_urls.length > 0) {
                        r.dni_urls.forEach((url: string, j: number) => {
                            const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
                            promises.push(fetchAndAdd(url, `Responsables/${(i + 1)}_${rName}_DNI_${j + 1}.${ext}`));
                            fileCounts.resp_dni++;
                        });
                    }
                });
            }

            // Execute all fetches
            setZipStatus(`Descargando ${promises.length} archivos externos...`);
            await Promise.all(promises);

            // Generate
            setZipStatus("Comprimiendo ZIP...");
            const content = await zip.generateAsync({ type: "blob" });
            const { saveAs } = await import('file-saver');
            saveAs(content, `${folderName}.zip`);

            if (errorCount > 0) {
                const msg = `⚠️ Completado con errores. Éxito: ${successCount}, Fallos: ${errorCount}. Detalles en .txt del ZIP.`;
                setZipStatus(msg);
                alert(msg);
            } else {
                const totalFiles = successCount;
                const msg = `✅ ZIP generado (${totalFiles} archivos). PDF:${fileCounts.pdf}, Audio:${fileCounts.music}, Pagos:${fileCounts.payment}, DNI:${fileCounts.part_dni}, Auth:${fileCounts.part_auth}, DNI-Auth:${fileCounts.part_auth_dni}`;
                setZipStatus(msg);
                // alert(msg);
            }

        } catch (e: any) {
            console.error("Error creating ZIP:", e);
            setZipStatus("❌ Error crítico: " + e.message);
            alert("Error al crear el archivo ZIP: " + e.message);
        } finally {
            setIsZipping(false);
            setTimeout(() => {
                // Optional clear
            }, 10000);
        }
    };

    const fetchSchools = async () => {
        setLoading(true);
        try {
            const result = await getSchoolsStatsAction();
            if (result.success && result.data) {
                setSchools(result.data);
            } else {
                console.error("Error fetching schools", result.error);
            }
        } catch (error) {
            console.error("Error fetching schools", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolRegistrations = async (userId: string) => {
        setSchoolRegistrations([]); // Clear previous
        try {
            const result = await getSchoolRegistrationsAction(userId);
            if (!result.success || !result.data) throw new Error(result.error);
            setSchoolRegistrations(result.data);
        } catch (error) {
            console.error("Error fetching school registrations", error);
        }
    };

    const fetchSchoolTickets = async (userId: string) => {
        setSchoolTickets([]);
        try {
            const result = await getSchoolTicketsAction(userId);
            if (result.success && result.data) {
                setSchoolTickets(result.data);
            }
        } catch (error) {
            console.error("Error fetching school tickets", error);
        }
    };

    const openSchoolDetails = (school: any) => {
        setSelectedSchool(school);
        fetchSchoolRegistrations(school.id);
        fetchSchoolTickets(school.id); // Also fetch tickets
    };

    const handleSort = (key: string) => {
        setSortConfigs(prev => {
            const index = prev.findIndex(c => c.key === key);
            if (index === -1) {
                // Add new criteria at the end (accumulation)
                return [...prev, { key, direction: 'asc' }];
            } else {
                // Toggle direction of existing criteria
                const newConfigs = [...prev];
                newConfigs[index] = {
                    ...newConfigs[index],
                    direction: newConfigs[index].direction === 'asc' ? 'desc' : 'asc'
                };
                return newConfigs;
            }
        });
    };

    const clearSort = () => setSortConfigs([]);

    const renderSortIndicator = (key: string) => {
        const index = sortConfigs.findIndex(c => c.key === key);
        if (index === -1) return <ArrowUpDown size={14} className="opacity-30 group-hover/th:opacity-100 transition-opacity" />;

        const config = sortConfigs[index];
        return (
            <div className="flex items-center gap-1">
                {sortConfigs.length > 1 && (
                    <span className="text-[10px] bg-[var(--primary)]/20 text-[var(--primary)] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-[var(--primary)]/30">
                        {index + 1}
                    </span>
                )}
                {config.direction === 'asc' ? <ArrowUp size={14} className="text-[var(--primary)]" /> : <ArrowDown size={14} className="text-[var(--primary)]" />}
            </div>
        );
    };

    const handleSchoolSort = (key: string) => {
        if (schoolSort === key) {
            setSchoolSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSchoolSort(key);
            setSchoolSortOrder('desc');
        }
    };

    const renderSchoolSortIndicator = (key: string) => {
        if (schoolSort !== key) return <ArrowUpDown size={12} className="opacity-30" />;
        return schoolSortOrder === 'asc' ? <ChevronUp size={12} className="text-[var(--primary)]" /> : <ChevronDown size={12} className="text-[var(--primary)]" />;
    };

    // Include Unread Count in sort logic if desired?
    // For now, let's just stick to display.

    // Block Filter State
    const [filterBlock, setFilterBlock] = useState<string>('all');
    // Verified Filter State
    const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'pending' | 'submitted' | 'draft' | 'modifiable'>('all');

    const BLOCK_DEFINITIONS: Record<string, string[]> = {
        'Bloque 1 (Mañana 1)': ['Infantil', 'Infantil Mini-parejas', 'Mini-Solistas Infantil'],
        'Bloque 2 (Mañana 2)': ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior'],
        'Bloque 3 (Tarde 1)': ['Juvenil', 'Juvenil Parejas', 'Solistas Juvenil'],
        'Bloque 4 (Tarde 2)': ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium'],
    };

    const getCategoryBlock = (category: string): string => {
        if (BLOCK_DEFINITIONS['Bloque 1 (Mañana 1)'].includes(category)) return 'block1';
        if (BLOCK_DEFINITIONS['Bloque 2 (Mañana 2)'].includes(category)) return 'block2';
        if (BLOCK_DEFINITIONS['Bloque 3 (Tarde 1)'].includes(category)) return 'block3';
        if (BLOCK_DEFINITIONS['Bloque 4 (Tarde 2)'].includes(category)) return 'block4';
        return 'unknown';
    };

    const calculateTicketsByBlock = (participants: any[]) => {
        const blocks = { block1: 0, block2: 0, block3: 0, block4: 0 };

        participants?.forEach(p => {
            const blockId = getCategoryBlock(p.category);
            if (blockId && blocks.hasOwnProperty(blockId)) {
                blocks[blockId as keyof typeof blocks] += p.num_tickets || 0;
            }
        });

        return blocks;
    };

    // Filter Logic
    const filteredRegistrations = registrations.filter(reg => {
        // 1. Block Filter
        let matchesBlock = true;
        if (filterBlock !== 'all') {
            const targetCategories = BLOCK_DEFINITIONS[filterBlock] || [];
            matchesBlock = targetCategories.includes(reg.category);
        }

        // 2. Verified Filter
        let matchesVerified = true;
        if (filterVerified === 'draft') matchesVerified = reg.status === 'draft';
        if (filterVerified === 'modifiable') matchesVerified = reg.status === 'submitted_modifiable';
        // For submitted/verified/pending, we STRICTLY exclude drafts to avoid noise
        if (filterVerified === 'submitted') matchesVerified = reg.status !== 'draft';
        if (filterVerified === 'verified') matchesVerified = reg.is_confirmed === true;
        if (filterVerified === 'pending') matchesVerified = !reg.is_confirmed && reg.status !== 'draft'; // Only actual submissions

        return matchesBlock && matchesVerified;
    });

    const sortedRegistrations = [...filteredRegistrations].sort((a, b) => {
        if (sortConfigs.length === 0) {
            // Default sort: Unread first, then by date
            const unreadA = unreadStats.counts[a.id] || 0;
            const unreadB = unreadStats.counts[b.id] || 0;
            if (unreadA !== unreadB) return unreadB - unreadA; // Descending unread count
            return 0;
        }

        // iterate through sort configs
        for (const config of sortConfigs) {
            const { key, direction } = config;
            let result = 0;

            if (key === 'tickets_count') {
                const valA = a.registration_participants?.reduce((sum: number, p: any) => sum + p.num_tickets, 0) || 0;
                const valB = b.registration_participants?.reduce((sum: number, p: any) => sum + p.num_tickets, 0) || 0;
                result = direction === 'asc' ? valA - valB : valB - valA;
            } else if (key === 'dancers_count') {
                const valA = a.registration_participants?.length || 0;
                const valB = b.registration_participants?.length || 0;
                result = direction === 'asc' ? valA - valB : valB - valA;
            } else if (key === 'responsibles_count') {
                const valA = a.registration_responsibles?.[0]?.count || 0;
                const valB = b.registration_responsibles?.[0]?.count || 0;
                result = direction === 'asc' ? valA - valB : valB - valA;
            } else if (key === 'updated_at' || key === 'created_at') {
                const dateA = new Date(a[key]).getTime();
                const dateB = new Date(b[key]).getTime();
                result = direction === 'asc' ? dateA - dateB : dateB - dateA;
            } else if (key === 'payment_proof') {
                const hasA = (a.payment_proof_urls?.length > 0 || a.payment_proof_url) ? 1 : 0;
                const hasB = (b.payment_proof_urls?.length > 0 || b.payment_proof_url) ? 1 : 0;
                result = direction === 'asc' ? hasA - hasB : hasB - hasA;
            } else if (key === 'assignment_status') {
                const getStatusScore = (reg: any) => {
                    const total = reg.registration_participants?.reduce((sum: number, p: any) => sum + p.num_tickets, 0) || 0;
                    const assigned = reg.tickets?.[0]?.count || 0;
                    if (total > 0 && assigned >= total) return 2;
                    if (assigned > 0) return 1;
                    return 0;
                };
                const scoreA = getStatusScore(a);
                const scoreB = getStatusScore(b);
                result = direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
            } else if (key === 'block') {
                const getBlockScore = (category: string) => {
                    if (BLOCK_DEFINITIONS['Bloque 1 (Mañana 1)'].includes(category)) return 1;
                    if (BLOCK_DEFINITIONS['Bloque 2 (Mañana 2)'].includes(category)) return 2;
                    if (BLOCK_DEFINITIONS['Bloque 3 (Tarde 1)'].includes(category)) return 3;
                    if (BLOCK_DEFINITIONS['Bloque 4 (Tarde 2)'].includes(category)) return 4;
                    return 0;
                };
                const valA = getBlockScore(a.category);
                const valB = getBlockScore(b.category);
                result = direction === 'asc' ? valA - valB : valB - valA;
            } else if (key === 'is_confirmed') {
                const valA = a.is_confirmed ? 1 : 0;
                const valB = b.is_confirmed ? 1 : 0;
                result = direction === 'asc' ? valA - valB : valB - valA;
            } else {
                // Default String Sort
                let valA = a[key] || '';
                let valB = b[key] || '';
                if (key === 'school_name') {
                    valA = a.school_name || "Desconocida";
                    valB = b.school_name || "Desconocida";
                }
                if (valA < valB) result = direction === 'asc' ? -1 : 1;
                else if (valA > valB) result = direction === 'asc' ? 1 : -1;
            }

            if (result !== 0) return result;
        }

        return 0;
    });

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
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shrink-0">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-lg leading-tight">Panel de Administración</h1>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                            <span className={`text-xs font-bold ${groupRegistrationEnabled ? 'text-green-400' : 'text-red-400'}`}>
                                {groupRegistrationEnabled ? 'INSCRIPCIONES ABIERTAS' : 'INSCRIPCIONES CERRADAS'}
                            </span>
                            <button
                                onClick={toggleGroupRegistration}
                                className={`w-10 h-6 rounded-full p-1 transition-colors relative ${groupRegistrationEnabled ? 'bg-green-500' : 'bg-neutral-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${groupRegistrationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
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

            <main className="max-w-7xl mx-auto p-4 md:p-8 overflow-x-hidden">

                <div className="flex gap-4 mb-4 md:mb-8 border-b border-white/10 overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`pb-4 px-2 font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'registrations' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Inscripciones
                        <AdminSidebarNotificationBadge count={unreadStats.total} />
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
                        onClick={() => setActiveTab('seating')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'seating' ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Asientos
                        {activeTab === 'seating' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
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
                    <Link
                        href="/admin/scores"
                        className="pb-4 px-2 font-medium transition-colors relative text-gray-400 hover:text-white flex items-center gap-2"
                    >
                        <Trophy size={18} /> Puntuaciones
                    </Link>

                    <button
                        onClick={() => setActiveTab('quotas')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'quotas' ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        Plazas Extra
                        {activeTab === 'quotas' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500" />}
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
                {activeTab === 'quotas' ? (
                    <div className="space-y-6">
                        <AdminQuotasManager />
                    </div>
                ) : activeTab === 'registrations' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="text-gray-400" />
                                Grupos Inscritos
                                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300 ml-2">
                                    {sortedRegistrations.length}
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

                        {/* FILTERS */}
                        <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                            {/* Block Filter */}
                            <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 min-w-fit">
                                    <Filter size={16} />
                                    Bloque:
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterBlock('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterBlock === 'all'
                                            ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,0,204,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    {Object.keys(BLOCK_DEFINITIONS).map(block => {
                                        // Count items in this block (respecting other filters?) -> No, typically counts show total possible. 
                                        // Or maybe filtered by verification? Let's keep it simple: Raw counts in block.
                                        const count = registrations.filter(r => BLOCK_DEFINITIONS[block].includes(r.category)).length;
                                        return (
                                            <button
                                                key={block}
                                                onClick={() => setFilterBlock(block)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${filterBlock === block
                                                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                                    }`}
                                            >
                                                {block} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Block Category Breakdown (Only when a block is selected) */}
                            {filterBlock !== 'all' && (
                                <div className="border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 mr-2">Desglose {filterBlock}:</span>
                                        {(() => {
                                            // Calculate breakdown for currently selected block logic
                                            // We use 'registrations' (all) but filter by block to give global view of that block,
                                            // OR should we respect the 'filterVerified' too?
                                            // User asked: "al elegir cada bloque tambien me diga cuantos grupos son de cada categoria de ese bloque"
                                            // Usually implies Total within that Block. But maybe Filtered is better?
                                            // Let's show TOTALS for the block to be most useful for planning.

                                            const blockCategories = BLOCK_DEFINITIONS[filterBlock] || [];
                                            const blockRegs = registrations.filter(r => blockCategories.includes(r.category));

                                            // Group by category
                                            const counts: Record<string, number> = {};
                                            blockCategories.forEach(cat => counts[cat] = 0);
                                            blockRegs.forEach(r => {
                                                if (counts[r.category] !== undefined) counts[r.category]++;
                                            });

                                            return Object.entries(counts).map(([cat, count]) => (
                                                <div key={cat} className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                                                    <span className="text-gray-300">{cat}</span>
                                                    <span className={`font-bold ${count > 0 ? 'text-white' : 'text-gray-600'}`}>{count}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Verified Filter */}
                            <div className="flex items-center gap-4 border-t border-white/5 pt-4 overflow-x-auto pb-2 md:pb-0">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 min-w-fit">
                                    <Filter size={16} />
                                    Filtrar Grupos:
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterVerified('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${filterVerified === 'all'
                                            ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_0_15px_rgba(255,0,204,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setFilterVerified('draft')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${filterVerified === 'draft'
                                            ? 'bg-neutral-600 border-neutral-500 text-white'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                            }`}
                                    >
                                        <FileText size={14} /> Borradores
                                    </button>
                                    <button
                                        onClick={() => setFilterVerified('modifiable')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${filterVerified === 'modifiable'
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-orange-500/50 hover:text-orange-400'
                                            }`}
                                    >
                                        <RefreshCw size={14} /> Modificables
                                    </button>
                                    <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                    <button
                                        onClick={() => setFilterVerified('submitted')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${filterVerified === 'submitted'
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-blue-500/50 hover:text-blue-400'
                                            }`}
                                    >
                                        <Send size={14} /> Enviados
                                    </button>
                                    <button
                                        onClick={() => setFilterVerified('verified')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${filterVerified === 'verified'
                                            ? 'bg-green-500 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-green-500/50 hover:text-green-400'
                                            }`}
                                    >
                                        <Check size={14} /> Verificados
                                    </button>
                                    <button
                                        onClick={() => setFilterVerified('pending')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${filterVerified === 'pending'
                                            ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-yellow-500/50 hover:text-yellow-400'
                                            }`}
                                    >
                                        <Clock size={14} /> Pendientes
                                    </button>
                                </div>
                            </div>

                            {/* Block Category Breakdown (Only when a block is selected) */}
                            {filterBlock !== 'all' && (
                                <div className="border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 mr-2">Desglose {filterBlock}:</span>
                                        {(() => {
                                            // Calculate breakdown for currently selected block logic
                                            // We use 'registrations' (all) but filter by block to give global view of that block,
                                            // OR should we respect the 'filterVerified' too? 
                                            // User asked: "al elegir cada bloque tambien me diga cuantos grupos son de cada categoria de ese bloque"
                                            // Usually implies Total within that Block. But maybe Filtered is better?
                                            // Let's show TOTALS for the block to be most useful for planning.

                                            const blockCategories = BLOCK_DEFINITIONS[filterBlock] || [];
                                            const blockRegs = registrations.filter(r => blockCategories.includes(r.category));

                                            // Group by category
                                            const counts: Record<string, number> = {};
                                            blockCategories.forEach(cat => counts[cat] = 0);
                                            blockRegs.forEach(r => {
                                                if (counts[r.category] !== undefined) counts[r.category]++;
                                            });

                                            return Object.entries(counts).map(([cat, count]) => (
                                                <div key={cat} className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                                                    <span className="text-gray-300">{cat}</span>
                                                    <span className={`font-bold ${count > 0 ? 'text-white' : 'text-gray-600'}`}>{count}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                            {sortConfigs.length > 0 && (
                                <div className="flex items-center gap-4 border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={clearSort}
                                        className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20"
                                    >
                                        <X size={14} /> Limpiar Orden ({sortConfigs.length})
                                    </button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-gray-500">Cargando datos...</div>
                        ) : sortedRegistrations.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-gray-500">No hay inscripciones en este bloque.</p>
                            </div>
                        ) : (
                            <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                            <th
                                                className="p-4 font-medium cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('group_name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Grupo / Escuela
                                                    {renderSortIndicator('group_name')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('is_confirmed')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Verificado
                                                    {renderSortIndicator('is_confirmed')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('status')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Estado
                                                    {renderSortIndicator('status')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('created_at')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Fecha Envío
                                                    {renderSortIndicator('created_at')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('block')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Bloque
                                                    {renderSortIndicator('block')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('category')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Categoría
                                                    {renderSortIndicator('category')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('updated_at')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Modificado
                                                    {renderSortIndicator('updated_at')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('responsibles_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Resp.
                                                    {renderSortIndicator('responsibles_count')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('dancers_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Bailarines
                                                    {renderSortIndicator('dancers_count')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('tickets_count')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Entradas Totales
                                                    {renderSortIndicator('tickets_count')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium text-center cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('assignment_status')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Asignación
                                                    {renderSortIndicator('assignment_status')}
                                                </div>
                                            </th>
                                            <th
                                                className="p-4 font-medium cursor-pointer hover:text-white transition-colors select-none group/th"
                                                onClick={() => handleSort('payment_proof')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Justificante
                                                    {renderSortIndicator('payment_proof')}
                                                </div>
                                            </th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedRegistrations.map((reg) => {
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
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            {reg.group_name}
                                                            {/* Chat / Notifications Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fetchRegistrationDetails(reg.id);
                                                                }}
                                                                className="relative group/chat outline-none ml-1 p-1 hover:bg-white/10 rounded-md transition-colors"
                                                                title="Abrir Chat con el Grupo"
                                                            >
                                                                <MessageSquare
                                                                    size={18}
                                                                    className={`transition-colors ${unreadStats.counts[reg.id] > 0 ? "text-white fill-white/10" : "text-gray-600 hover:text-white"}`}
                                                                />

                                                                {unreadStats.counts[reg.id] > 0 && (
                                                                    <div className="absolute -top-2 -right-2 animate-bounce bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                                                        {unreadStats.counts[reg.id]}
                                                                    </div>
                                                                )}
                                                            </button>


                                                        </div>
                                                        {reg.school_name && <div className="text-[10px] text-gray-500 uppercase font-black">{reg.school_name}</div>}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const res = await toggleRegistrationConfirmation(reg.id, !reg.is_confirmed);
                                                                if (res.success) {
                                                                    fetchRegistrations();
                                                                } else {
                                                                    alert("Error: " + res.error);
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-full transition-colors ${reg.is_confirmed
                                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                : 'bg-white/5 text-gray-600 hover:bg-white/10 hover:text-gray-400'
                                                                }`}
                                                            title={reg.is_confirmed ? "Confirmado" : "Pendiente"}
                                                        >
                                                            {reg.is_confirmed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <select
                                                                value={reg.status || 'draft'}
                                                                onChange={async (e) => {
                                                                    const newStatus = e.target.value as 'draft' | 'submitted' | 'submitted_modifiable';
                                                                    const res = await updateRegistrationStatus(reg.id, newStatus);
                                                                    if (res.success) {
                                                                        fetchRegistrations();
                                                                    } else {
                                                                        alert("Error: " + res.error);
                                                                    }
                                                                }}
                                                                className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border outline-none cursor-pointer transition-all ${reg.status === 'submitted'
                                                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                                    : reg.status === 'submitted_modifiable'
                                                                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                                                    }`}
                                                            >
                                                                <option value="draft" className="bg-neutral-900 text-yellow-400">Borrador</option>
                                                                <option value="submitted" className="bg-neutral-900 text-green-400">Enviado</option>
                                                                <option value="submitted_modifiable" className="bg-neutral-900 text-orange-400">Modificable</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-400 font-mono">
                                                        {new Date(reg.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {(() => {
                                                            const blockName = Object.keys(BLOCK_DEFINITIONS).find(b => BLOCK_DEFINITIONS[b].includes(reg.category)) || '-';
                                                            const shortName = blockName.split(' ')[0] + ' ' + blockName.split(' ')[1]; // "Bloque 1"
                                                            return (
                                                                <span className="text-xs font-bold text-gray-400 bg-white/5 px-2 py-1 rounded-lg whitespace-nowrap">
                                                                    {shortName !== 'undefined undefined' ? shortName : '-'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded text-sm font-medium">
                                                            {reg.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-400 font-mono">
                                                        {new Date(reg.updated_at).toLocaleString()}
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
                                                        {(reg.payment_proof_urls && reg.payment_proof_urls.length > 0) || reg.payment_proof_url ? (
                                                            <a
                                                                href={reg.payment_proof_urls?.[0] || reg.payment_proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium"
                                                            >
                                                                <FileText size={16} /> Ver Justificante{reg.payment_proof_urls?.length > 1 ? `s(${reg.payment_proof_urls.length})` : ''}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600 text-sm">Pendiente</span>
                                                        )}
                                                    </td>
                                                    {/* Removed old date cell location */}
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
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Building className="text-gray-400" />
                                Escuelas Registradas
                                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300 ml-2">
                                    {schools.length}
                                </span>
                            </h2>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchSchools}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors bg-white/5"
                                    title="Refrescar lista"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
                            {schools.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 m-4 rounded-xl">
                                    <p className="text-gray-500">No hay escuelas registradas.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b border-white/10">
                                        <tr>
                                            <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('school_name')}>
                                                <div className="flex items-center gap-1">
                                                    Escuela / Responsable
                                                    {renderSchoolSortIndicator('school_name')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('created_at')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Creación
                                                    {renderSchoolSortIndicator('created_at')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('groups_count')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Grupos
                                                    {renderSchoolSortIndicator('groups_count')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('participants_count')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Part.
                                                    {renderSchoolSortIndicator('participants_count')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('tickets_by_block.block1')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    B1
                                                    {renderSchoolSortIndicator('tickets_by_block.block1')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('tickets_by_block.block2')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    B2
                                                    {renderSchoolSortIndicator('tickets_by_block.block2')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('tickets_by_block.block3')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    B3
                                                    {renderSchoolSortIndicator('tickets_by_block.block3')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('tickets_by_block.block4')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    B4
                                                    {renderSchoolSortIndicator('tickets_by_block.block4')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSchoolSort('total_tickets')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Total Butacas
                                                    {renderSchoolSortIndicator('total_tickets')}
                                                </div>
                                            </th>
                                            <th className="p-4 text-center">Acceso</th>
                                            <th className="p-4 text-right">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[...schools]
                                            .sort((a, b) => {
                                                const getVal = (obj: any, path: string) => {
                                                    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                                                };
                                                const valA = getVal(a, schoolSort);
                                                const valB = getVal(b, schoolSort);
                                                if (valA < valB) return schoolSortOrder === 'asc' ? -1 : 1;
                                                if (valA > valB) return schoolSortOrder === 'asc' ? 1 : -1;
                                                return 0;
                                            })
                                            .map((school) => (
                                                <tr key={school.id} className="group hover:bg-white/5 transition-colors border-b border-white/5">
                                                    <td className="p-4">
                                                        <div className="font-bold text-white group-hover:text-[var(--primary)] transition-colors">
                                                            {school.school_name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 uppercase">{school.rep_name} {school.rep_surnames}</div>
                                                        {/* DEBUG: Hidden data for inspection */}
                                                        <div className="hidden">{JSON.stringify(school.tickets_by_block)}</div>
                                                    </td>
                                                    <td className="p-4 text-center text-xs text-gray-400 font-mono">
                                                        {new Date(school.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-white">
                                                        {school.groups_count}
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-white">
                                                        {school.participants_count}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(school.tickets_by_block?.block1 || 0) > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-600'}`}>
                                                            {school.tickets_by_block?.block1 || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(school.tickets_by_block?.block2 || 0) > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-600'}`}>
                                                            {school.tickets_by_block?.block2 || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(school.tickets_by_block?.block3 || 0) > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-600'}`}>
                                                            {school.tickets_by_block?.block3 || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${(school.tickets_by_block?.block4 || 0) > 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-gray-600'}`}>
                                                            {school.tickets_by_block?.block4 || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs font-bold text-white">
                                                            {school.total_tickets}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {school.is_approved ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("¿Bloquear acceso a esta escuela?")) {
                                                                        toggleSchoolApproval(school.id, false).then(() => fetchSchools());
                                                                    }
                                                                }}
                                                                className="text-[10px] font-black text-green-500 hover:text-red-500 uppercase tracking-tighter"
                                                            >
                                                                Activa
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("¿Aprobar acceso a esta escuela?")) {
                                                                        toggleSchoolApproval(school.id, true).then(() => fetchSchools());
                                                                    }
                                                                }}
                                                                className="bg-green-500 text-white px-2 py-1 rounded-[4px] text-[9px] font-black uppercase hover:bg-green-600"
                                                            >
                                                                Aprobar
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => openSchoolDetails(school)}
                                                            className="p-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-gray-400 hover:text-white transition-all group-hover:border-blue-500/30"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'judges' ? (
                    <AdminJudgesManager />
                ) : activeTab === 'faq' ? (
                    <AdminFAQManager />

                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Próximamente</h3>
                        <p className="text-gray-500">El módulo de ventas de entradas estará disponible pronto.</p>
                    </div>
                )}

                {
                    activeTab === 'seating' && (
                        <AdminSeatingManager />
                    )
                }

                {
                    activeTab === 'config' && (
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
                    )
                }
            </main >

            {/* DETAIL MODAL */}
            {
                selectedRegistration && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-neutral-900 border-0 md:border border-white/10 w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative">

                            {/* Mobile Fixed Close Button */}
                            <button
                                onClick={() => setSelectedRegistration(null)}
                                className="md:hidden absolute top-4 right-4 z-50 bg-black/50 backdrop-blur text-white p-2 rounded-full border border-white/10 shadow-lg"
                            >
                                <X size={24} />
                            </button>

                            {/* Modal Header */}
                            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start gap-4 bg-black/50">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedRegistration.group_name}</h2>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                                        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 group">
                                            <span>Cat:</span>
                                            <select
                                                value={selectedRegistration.category}
                                                onChange={async (e) => {
                                                    const res = await updateRegistrationCategory(selectedRegistration.id, e.target.value);
                                                    if (res.success) {
                                                        fetchRegistrationDetails(selectedRegistration.id);
                                                        fetchRegistrations();
                                                    } else {
                                                        alert("Error: " + res.error);
                                                    }
                                                }}
                                                className="bg-transparent text-white font-bold outline-none cursor-pointer hover:text-[var(--primary)] transition-colors"
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
                                            {selectedRegistration.original_category && selectedRegistration.original_category !== selectedRegistration.category && (
                                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black border border-orange-500/30" title={`Original: ${selectedRegistration.original_category}`}>MODIFICADA</span>
                                            )}
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10">
                                            <span>Estado:</span>
                                            <select
                                                value={selectedRegistration.status || 'draft'}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value as any;
                                                    const res = await updateRegistrationStatus(selectedRegistration.id, newStatus);
                                                    if (res.success) {
                                                        fetchRegistrationDetails(selectedRegistration.id);
                                                        fetchRegistrations();
                                                    } else {
                                                        alert("Error: " + res.error);
                                                    }
                                                }}
                                                className={`bg-transparent font-black outline-none cursor-pointer transition-colors ${selectedRegistration.status === 'submitted' ? 'text-green-400' :
                                                    selectedRegistration.status === 'submitted_modifiable' ? 'text-orange-400' :
                                                        'text-yellow-400'
                                                    }`}
                                            >
                                                <option value="draft" className="bg-neutral-900 text-yellow-400">BORRADOR</option>
                                                <option value="submitted" className="bg-neutral-900 text-green-400">ENVIADO (LOCK)</option>
                                                <option value="submitted_modifiable" className="bg-neutral-900 text-orange-400">MODIFICABLE</option>
                                            </select>
                                        </div>
                                        <span>•</span>
                                        <span>Inscrito el {new Date(selectedRegistration.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    {selectedRegistration && (
                                        <RegistrationPDFButton registration={selectedRegistration} />
                                    )}
                                    <button
                                        onClick={() => handleDownloadZip(selectedRegistration)}
                                        disabled={isZipping}
                                        className="bg-white/10 hover:bg-white/20 hover:text-white text-gray-300 text-xs md:text-sm font-bold px-3 py-2 md:px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isZipping ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={16} />}
                                        ZIP
                                    </button>
                                    <Link
                                        href={`/admin/assign/${selectedRegistration.id}`}
                                        className="bg-[var(--primary)] hover:bg-pink-600 text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 rounded-lg transition-colors shadow-[0_0_15px_rgba(255,0,204,0.4)] flex items-center gap-2"
                                    >
                                        <Ticket size={16} /> <span className="hidden md:inline">Asignar</span>
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
                                        className="hidden md:flex bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Status Toggles Bar */}
                            <div className="bg-white/5 border-b border-white/10 p-4 flex flex-wrap gap-4 items-center justify-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Estado Solicitud:</span>
                                    <button
                                        onClick={async () => {
                                            const res = await toggleRegistrationConfirmation(selectedRegistration.id, !selectedRegistration.is_confirmed);
                                            if (res.success) {
                                                alert("Estado de confirmación actualizado.");
                                                fetchRegistrationDetails(selectedRegistration.id);
                                                fetchRegistrations();
                                            } else {
                                                alert("Error: " + res.error);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedRegistration.is_confirmed ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                    >
                                        {selectedRegistration.is_confirmed ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                        {selectedRegistration.is_confirmed ? 'INSCRIPCIÓN CONFIRMADA' : 'PENDIENTE DE CONFIRMAR'}
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-white/10 hidden md:block" />

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Validación Pago:</span>
                                    <button
                                        onClick={async () => {
                                            const res = await togglePaymentVerification(selectedRegistration.id, !selectedRegistration.payment_verified);
                                            if (res.success) {
                                                alert("Estado de pago actualizado.");
                                                fetchRegistrationDetails(selectedRegistration.id);
                                                fetchRegistrations();
                                            } else {
                                                alert("Error: " + res.error);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedRegistration.payment_verified ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                    >
                                        {selectedRegistration.payment_verified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                        {selectedRegistration.payment_verified ? 'PAGO VERIFICADO' : 'PAGO POR VALIDAR'}
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

                                                {/* DNI Display */}
                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                    <p className="text-xs text-gray-500 mb-2">Documentos DNI:</p>
                                                    {resp.dni_urls && resp.dni_urls.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {resp.dni_urls.map((url: string, idx: number) => (
                                                                <a
                                                                    key={idx}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-blue-400 px-2 py-1 rounded text-xs transition-colors"
                                                                >
                                                                    <FileText size={12} /> Archivo {idx + 1}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-600 italic">No hay archivos</span>
                                                    )}
                                                </div>
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
                                    <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                                                <tr>
                                                    <th className="p-3 font-medium">Nombre</th>
                                                    <th className="p-3 font-medium">F. Nacim</th>
                                                    <th className="p-3 font-medium text-center">Entradas (Edit)</th>
                                                    <th className="p-3 font-medium text-right">Documentación</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {selectedRegistration.registration_participants?.map((part: any) => (
                                                    <tr key={part.id} className="hover:bg-white/5">
                                                        <td className="p-3 font-medium">{part.name} {part.surnames}</td>
                                                        <td className="p-3 text-gray-400">{new Date(part.dob).toLocaleDateString()}</td>
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                defaultValue={part.num_tickets}
                                                                onBlur={async (e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (!isNaN(val) && val !== part.num_tickets) {
                                                                        const res = await updateParticipantTickets(part.id, val);
                                                                        if (res.success) {
                                                                            fetchRegistrationDetails(selectedRegistration.id);
                                                                            fetchRegistrations();
                                                                        } else {
                                                                            alert("Error al actualizar entradas: " + res.error);
                                                                            e.target.value = part.num_tickets.toString();
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-16 bg-black/20 border border-white/10 rounded px-2 py-1 text-center text-white font-bold focus:border-[var(--primary)] outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex flex-col items-end gap-2 text-xs">

                                                                {/* AUTORIZACIÓN */}
                                                                <div className="flex flex-wrap justify-end gap-1">
                                                                    {/* Legacy */}
                                                                    {part.authorization_url && (
                                                                        <a href={part.authorization_url} target="_blank" className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-pink-400 border border-pink-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> Auth (Antigua)
                                                                        </a>
                                                                    )}
                                                                    {/* New Arrays */}
                                                                    {part.authorization_urls?.map((url: string, i: number) => (
                                                                        <a key={`auth-${i}`} href={url} target="_blank" className="bg-pink-500/10 hover:bg-pink-500/20 px-2 py-1 rounded text-pink-400 border border-pink-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> Auth {i + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>

                                                                {/* DNI */}
                                                                <div className="flex flex-wrap justify-end gap-1">
                                                                    {/* Legacy */}
                                                                    {part.dni_url && (
                                                                        <a href={part.dni_url} target="_blank" className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> DNI (Antiguo)
                                                                        </a>
                                                                    )}
                                                                    {/* New Arrays */}
                                                                    {part.dni_urls?.map((url: string, i: number) => (
                                                                        <a key={`dni-${i}`} href={url} target="_blank" className="bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> DNI {i + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>

                                                                {/* DNI AUTORIZADO */}
                                                                <div className="flex flex-wrap justify-end gap-1">
                                                                    {/* Legacy */}
                                                                    {part.tutor_dni_url && (
                                                                        <a href={part.tutor_dni_url} target="_blank" className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> DNI Tutor (Old)
                                                                        </a>
                                                                    )}
                                                                    {/* New Arrays */}
                                                                    {part.authorized_dni_urls?.map((url: string, i: number) => (
                                                                        <a key={`authdni-${i}`} href={url} target="_blank" className="bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                                            <FileText size={10} /> DNI Tutor {i + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>

                                                                {/* GENERIC FILES (Backward Compat) */}
                                                                {part.file_urls && part.file_urls.length > 0 && (
                                                                    <div className="flex flex-wrap justify-end gap-1 mt-1 border-t border-white/5 pt-1">
                                                                        {part.file_urls.map((url: string, i: number) => (
                                                                            <a key={`gen-${i}`} href={url} target="_blank" className="text-gray-400 hover:text-white underline">Doc {i + 1}</a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-blue-200 text-sm">Fechas</h4>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <p className="text-blue-200/60 text-xs">Creado: {selectedRegistration.created_at ? new Date(selectedRegistration.created_at).toLocaleString() : '-'}</p>
                                            <p className="text-blue-200/60 text-xs">Modificado: {selectedRegistration.updated_at ? new Date(selectedRegistration.updated_at).toLocaleString() : '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-blue-200 text-sm">Justificante de Pago</h4>
                                        <p className="text-blue-200/60 text-xs">Concepto: {selectedRegistration.group_name} + Entradas</p>
                                    </div>
                                    {selectedRegistration.payment_proof_urls && selectedRegistration.payment_proof_urls.length > 0 ? (
                                        <div className="flex bg-blue-500/10 p-2 rounded-lg gap-2">
                                            {selectedRegistration.payment_proof_urls.map((url: string, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                >
                                                    <Eye size={12} /> Ver #{idx + 1}
                                                </a>
                                            ))}
                                        </div>
                                    ) : selectedRegistration.payment_proof_url ? (
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
                                <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-pink-200 text-sm">Música Coreografía</h4>
                                            <p className="text-pink-200/60 text-xs">Archivo MP3 para la actuación</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {selectedRegistration.music_file_url && (
                                                <a
                                                    href={selectedRegistration.music_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="bg-pink-500 hover:bg-pink-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                                >
                                                    <Music size={16} /> Descargar / Escuchar
                                                </a>
                                            )}
                                            <input
                                                type="text"
                                                placeholder="Pegar URL de música..."
                                                defaultValue={selectedRegistration.music_file_url || ''}
                                                onBlur={async (e) => {
                                                    const url = e.target.value.trim();
                                                    if (url !== (selectedRegistration.music_file_url || '')) {
                                                        const res = await updateMusicUrl(selectedRegistration.id, url);
                                                        if (res.success) {
                                                            fetchRegistrationDetails(selectedRegistration.id);
                                                        } else {
                                                            alert("Error actualizando música: " + res.error);
                                                        }
                                                    }
                                                }}
                                                className="bg-black/20 border border-white/10 rounded px-3 py-1 text-xs text-gray-300 w-64 focus:border-pink-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Music Status Selection */}
                                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-pink-500/20">
                                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Validación Audio:</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateMusicStatus(selectedRegistration.id, 'received').then(() => fetchRegistrationDetails(selectedRegistration.id))}
                                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${selectedRegistration.music_status === 'received' ? 'bg-pink-500 text-white' : 'bg-white/5 text-pink-400 hover:bg-white/10'}`}
                                            >
                                                RECIBIDA
                                            </button>
                                            <button
                                                onClick={() => updateMusicStatus(selectedRegistration.id, 'verified').then(() => fetchRegistrationDetails(selectedRegistration.id))}
                                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${selectedRegistration.music_status === 'verified' ? 'bg-green-500 text-white' : 'bg-white/5 text-green-400 hover:bg-white/10'}`}
                                            >
                                                AUDIO OK
                                            </button>
                                            <button
                                                onClick={() => updateMusicStatus(selectedRegistration.id, 'error').then(() => fetchRegistrationDetails(selectedRegistration.id))}
                                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${selectedRegistration.music_status === 'error' ? 'bg-red-500 text-white' : 'bg-white/5 text-red-400 hover:bg-white/10'}`}
                                            >
                                                ERROR AUDIO
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Notes */}
                                <div className="space-y-2 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10">
                                    <h4 className="font-bold text-yellow-500/80 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={16} /> Notas Internas (Admin)
                                    </h4>
                                    <textarea
                                        defaultValue={selectedRegistration.notes || ''}
                                        placeholder="Notas internas sobre esta inscripción..."
                                        onBlur={async (e) => {
                                            const note = e.target.value;
                                            if (note !== (selectedRegistration.notes || '')) {
                                                const res = await updateRegistrationNotes(selectedRegistration.id, note);
                                                if (!res.success) alert("Error guardando nota: " + res.error);
                                            }
                                        }}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-yellow-500/50 outline-none min-h-[80px]"
                                    />
                                </div>

                                {/* Chat / Notes */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-white/50 text-sm flex items-center gap-2 uppercase tracking-wider">
                                        <MessageSquare size={16} /> Comunicación con el Grupo
                                    </h4>
                                    <ChatSection registrationId={selectedRegistration.id} currentUserRole="admin" />
                                </div>

                                {/* Assigned Seats Detail Section */}
                                {selectedRegistration.tickets && selectedRegistration.tickets.length > 0 && (
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-blue-200 text-sm flex items-center gap-2">
                                                <Ticket size={16} /> Butacas Asignadas ({selectedRegistration.tickets.length})
                                            </h4>
                                            <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase">COMPLETADO</span>
                                        </div>
                                        <div className="space-y-4">
                                            {/* Group by session_id first */}
                                            {[...new Set(selectedRegistration.tickets.map((t: any) => t.session_id))].sort().map(blockId => {
                                                const blockTickets = selectedRegistration.tickets.filter((t: any) => t.session_id === blockId);
                                                if (blockTickets.length === 0) return null;

                                                const blockLabel = blockId === 'block1' ? 'Mañana B1' :
                                                    blockId === 'block2' ? 'Mañana B2' :
                                                        blockId === 'block3' ? 'Tarde B3' :
                                                            blockId === 'block4' ? 'Tarde B4' :
                                                                (blockId as string);

                                                // Group by row
                                                const rows: Record<string, number[]> = {};
                                                blockTickets.forEach((t: any) => {
                                                    let rowKey = 'Desconocido';
                                                    let seatNum = 0;

                                                    if (t.seat_id.startsWith('Patio')) {
                                                        const parts = t.seat_id.split('-');
                                                        rowKey = `P-Fila ${parts[1]}`;
                                                        seatNum = parseInt(parts[2]);
                                                    } else if (t.seat_id.startsWith('R')) {
                                                        const parts = t.seat_id.split('-');
                                                        const rowVal = parts[0].substring(1);
                                                        rowKey = `A-Fila ${rowVal}`;
                                                        seatNum = parseInt(parts[1]);
                                                    } else {
                                                        rowKey = `Otros`;
                                                        const match = t.seat_id.match(/(\d+)$/);
                                                        seatNum = match ? parseInt(match[1]) : 0;
                                                    }

                                                    if (!rows[rowKey]) rows[rowKey] = [];
                                                    if (!isNaN(seatNum)) rows[rowKey].push(seatNum);
                                                });

                                                return (
                                                    <div key={blockId as string} className="bg-black/30 border border-blue-500/20 rounded-lg p-3">
                                                        <h4 className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest border-b border-blue-500/20 pb-1">{blockLabel}</h4>
                                                        <div className="space-y-1">
                                                            {Object.entries(rows).sort().map(([rowLabel, seatNumbers]) => {
                                                                const sorted = [...seatNumbers].sort((a, b) => a - b);
                                                                const ranges: string[] = [];
                                                                if (sorted.length > 0) {
                                                                    let start = sorted[0];
                                                                    let prev = sorted[0];
                                                                    for (let i = 1; i <= sorted.length; i++) {
                                                                        if (i < sorted.length && sorted[i] === prev + 1) {
                                                                            prev = sorted[i];
                                                                        } else {
                                                                            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                                                                            if (i < sorted.length) {
                                                                                start = sorted[i];
                                                                                prev = sorted[i];
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                return (
                                                                    <p key={rowLabel} className="text-xs text-white">
                                                                        <span className="text-blue-300 font-bold">{rowLabel}:</span> {ranges.join(', ')}
                                                                    </p>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-blue-300/60 italic">
                                            Estas butacas han sido asignadas manualmente o mediante pedido confirmado para este grupo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SCHOOL DETAIL MODAL */}
            {
                selectedSchool && (
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-500 uppercase font-black mb-1">Email de Contacto</p>
                                        <p className="text-white font-medium break-all">{selectedSchool.rep_email}</p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                        <p className="text-xs text-gray-500 uppercase font-black mb-1">Teléfono</p>
                                        <p className="text-white font-medium">{selectedSchool.rep_phone}</p>
                                    </div>
                                </div>

                                {/* School Statistics Dashboard */}
                                <div className="mb-8 px-4 py-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-xl">
                                    {(() => {
                                        // Calculate aggregate statistics for all school registrations
                                        // Debug: Log all statuses to see what we're getting
                                        console.log('School Registrations:', schoolRegistrations.map((r: any) => ({
                                            id: r.id,
                                            group_name: r.group_name,
                                            status: r.status,
                                            is_confirmed: r.is_confirmed
                                        })));

                                        const draftCount = schoolRegistrations.filter((r: any) => !r.status || r.status === 'draft' || r.status === 'submitted_modifiable').length;
                                        const submittedCount = schoolRegistrations.filter((r: any) => r.status === 'submitted' && !r.is_confirmed).length;
                                        const verifiedCount = schoolRegistrations.filter((r: any) => r.is_confirmed === true).length;

                                        console.log('Counts:', { total: schoolRegistrations.length, draftCount, submittedCount, verifiedCount });

                                        let totalParticipants = 0;
                                        let totalTickets = 0;
                                        const ticketsByBlock = { block1: 0, block2: 0, block3: 0, block4: 0 };

                                        schoolRegistrations.forEach((reg: any) => {
                                            const participants = reg.registration_participants || [];
                                            totalParticipants += participants.length;
                                            participants.forEach((p: any) => {
                                                const tickets = p.num_tickets || 0;
                                                totalTickets += tickets;
                                                const blockId = getCategoryBlock(p.category);
                                                if (blockId && ticketsByBlock.hasOwnProperty(blockId)) {
                                                    ticketsByBlock[blockId as keyof typeof ticketsByBlock] += tickets;
                                                }
                                            });
                                        });

                                        return (
                                            <>
                                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 tracking-wide">Resumen General ({schoolRegistrations.length} grupos totales)</h3>

                                                {/* DEBUG PANEL - TEMPORAL */}
                                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
                                                    <div className="font-bold text-red-300 mb-2">🔍 DEBUG - Análisis de Estados:</div>
                                                    <div className="grid grid-cols-2 gap-2 text-white/80">
                                                        <div>status === 'draft': {schoolRegistrations.filter((r: any) => r.status === 'draft').length}</div>
                                                        <div>status === 'submitted_modifiable': {schoolRegistrations.filter((r: any) => r.status === 'submitted_modifiable').length}</div>
                                                        <div>status === 'submitted': {schoolRegistrations.filter((r: any) => r.status === 'submitted').length}</div>
                                                        <div>is_confirmed === true: {schoolRegistrations.filter((r: any) => r.is_confirmed === true).length}</div>
                                                        <div className="col-span-2 mt-2 pt-2 border-t border-red-500/30">
                                                            <div className="font-bold mb-1">Valores únicos de status:</div>
                                                            <div>{[...new Set(schoolRegistrations.map((r: any) => String(r.status)))].join(', ')}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status Overview Row */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Grupos</div>
                                                        <div className="text-2xl font-black text-white flex items-center gap-2">
                                                            <FileText size={20} />
                                                            {schoolRegistrations.length}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Borradores</div>
                                                        <div className="text-2xl font-black text-gray-300 flex items-center gap-2">
                                                            <AlertTriangle size={20} />
                                                            {draftCount}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Enviados</div>
                                                        <div className="text-2xl font-black text-yellow-400 flex items-center gap-2">
                                                            <Clock size={20} />
                                                            {submittedCount}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Verificados</div>
                                                        <div className="text-2xl font-black text-green-400 flex items-center gap-2">
                                                            <CheckCircle2 size={20} />
                                                            {verifiedCount}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Participants & Tickets Row */}
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                                                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-3 col-span-1">
                                                        <div className="text-xs font-bold text-blue-300 uppercase mb-1 flex items-center gap-1">
                                                            <Users size={14} />
                                                            Participantes
                                                        </div>
                                                        <div className="text-2xl font-black text-blue-200">{totalParticipants}</div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-lg p-3 col-span-1">
                                                        <div className="text-xs font-bold text-pink-300 uppercase mb-1 flex items-center gap-1">
                                                            <Ticket size={14} />
                                                            Total Entradas
                                                        </div>
                                                        <div className="text-2xl font-black text-pink-200">{totalTickets}</div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Bloque 1</div>
                                                        <div className="text-xl font-black text-white">{ticketsByBlock.block1}</div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Bloque 2</div>
                                                        <div className="text-xl font-black text-white">{ticketsByBlock.block2}</div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Bloque 3</div>
                                                        <div className="text-xl font-black text-white">{ticketsByBlock.block3}</div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Bloque 4</div>
                                                        <div className="text-xl font-black text-white">{ticketsByBlock.block4}</div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
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
                                                    <th className="p-3 font-medium text-center">Verificado</th>
                                                    <th className="p-3 font-medium text-center">Estado</th>
                                                    <th className="p-3 font-medium text-center">Tarde/Mañana</th>
                                                    <th className="p-3 font-medium text-center">Partic.</th>
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
                                                            {reg.is_confirmed ? (
                                                                <span className="text-green-500" title="Verificado">
                                                                    <CheckCircle2 size={16} className="mx-auto" />
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500" title="Pendiente">
                                                                    <Clock size={16} className="mx-auto" />
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`text - [10px] font - black uppercase px - 2 py - 0.5 rounded - full ${reg.status === 'submitted' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'} `}>
                                                                {reg.status === 'submitted' ? 'Enviado' : 'Borrador'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center text-sm text-gray-400">
                                                            {/* Session logic could be added here if session is stored, otherwise blank */}
                                                            -
                                                        </td>
                                                        <td className="p-3 text-center font-bold text-white">
                                                            {reg.registration_participants?.length || 0}
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

                                {/* School Seats Summary Section */}
                                <div className="mt-12 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Ticket size={18} className="text-blue-400" />
                                            Resumen de Butacas por Escuela
                                        </h3>

                                        {schoolTickets.length > 0 && (
                                            <SchoolTicketsPDFButton
                                                schoolName={selectedSchool?.school_name || "Escuela Desconocida"}
                                                schoolTickets={schoolTickets}
                                            />
                                        )}
                                    </div>

                                    {schoolTickets.length === 0 ? (
                                        <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                            <p className="text-gray-500">No hay butacas asignadas a ningún grupo de esta escuela aún.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                                                {/* Dynamically get all unique session_ids from tickets */}
                                                {[...new Set(schoolTickets.map(t => t.session_id))].sort().map(blockId => {
                                                    const blockTickets = schoolTickets.filter(t => t.session_id === blockId);
                                                    if (blockTickets.length === 0) return null;

                                                    const blockLabel = blockId === 'block1' ? 'Mañana B1' :
                                                        blockId === 'block2' ? 'Mañana B2' :
                                                            blockId === 'block3' ? 'Tarde B3' :
                                                                blockId === 'block4' ? 'Tarde B4' :
                                                                    blockId; // Fallback for other IDs

                                                    return (
                                                        <div key={blockId} className="bg-black/30 border border-white/5 rounded-lg p-3">
                                                            <h4 className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest border-b border-white/5 pb-1">{blockLabel}</h4>
                                                            <div className="space-y-4">
                                                                {/* Group by registration_id inside each block */}
                                                                {Object.entries(
                                                                    blockTickets.reduce((acc, t) => {
                                                                        const gName = t.group_name || 'Desconocido';
                                                                        if (!acc[gName]) acc[gName] = [];
                                                                        acc[gName].push(t);
                                                                        return acc;
                                                                    }, {} as Record<string, any[]>)
                                                                ).map(([groupName, gTickets]) => {
                                                                    // Complex grouping logic by row and ranges
                                                                    const rows: Record<string, number[]> = {};
                                                                    (gTickets as any[]).forEach(t => {
                                                                        let rowKey = 'Desconocido';
                                                                        let seatNum = 0;

                                                                        if (t.seat_id.startsWith('Patio')) {
                                                                            // Format: Patio-Row-Seat
                                                                            const parts = t.seat_id.split('-');
                                                                            rowKey = `P-Fila ${parts[1]}`;
                                                                            seatNum = parseInt(parts[2]);
                                                                        } else if (t.seat_id.startsWith('R')) {
                                                                            // Format: R[Row]-Seat (e.g. R2-10)
                                                                            const parts = t.seat_id.split('-');
                                                                            // parts[0] is 'R2' -> remove 'R' to get row
                                                                            const rowVal = parts[0].substring(1);
                                                                            rowKey = `A-Fila ${rowVal}`;
                                                                            seatNum = parseInt(parts[1]);
                                                                        } else {
                                                                            // Fallback
                                                                            rowKey = `Otros`;
                                                                            // Try to find a number at end
                                                                            const match = t.seat_id.match(/(\d+)$/);
                                                                            seatNum = match ? parseInt(match[1]) : 0;
                                                                        }

                                                                        if (!rows[rowKey]) rows[rowKey] = [];
                                                                        if (!isNaN(seatNum)) rows[rowKey].push(seatNum);
                                                                    });

                                                                    return (
                                                                        <div key={groupName} className="space-y-1.5">
                                                                            <p className="text-[10px] font-bold text-gray-300 leading-tight border-l-2 border-blue-500/50 pl-2">{groupName}</p>
                                                                            <div className="pl-2 space-y-1">
                                                                                {Object.entries(rows).sort().map(([rowLabel, seatNumbers]) => {
                                                                                    // Sort numbers to find ranges
                                                                                    const sorted = [...seatNumbers].sort((a, b) => a - b);
                                                                                    const ranges: string[] = [];
                                                                                    if (sorted.length > 0) {
                                                                                        let start = sorted[0];
                                                                                        let prev = sorted[0];
                                                                                        for (let i = 1; i <= sorted.length; i++) {
                                                                                            if (i < sorted.length && sorted[i] === prev + 1) {
                                                                                                prev = sorted[i];
                                                                                            } else {
                                                                                                ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                                                                                                if (i < sorted.length) {
                                                                                                    start = sorted[i];
                                                                                                    prev = sorted[i];
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                    return (
                                                                                        <p key={rowLabel} className="text-[10px] text-gray-400">
                                                                                            <span className="text-blue-300/80 font-medium">{rowLabel}:</span> {ranges.join(', ')}
                                                                                        </p>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ZIP STATUS TOAST */}
            {
                zipStatus && (
                    <div className="fixed bottom-10 right-10 z-[100] bg-black/90 border border-white/20 text-white p-4 rounded-xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                {zipStatus.includes('✅') ? <CheckCircle2 className="text-green-500" /> :
                                    zipStatus.includes('⚠️') ? <AlertTriangle className="text-yellow-500" /> :
                                        zipStatus.includes('❌') ? <XCircle className="text-red-500" /> :
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm mb-1">Generando documentación</h4>
                                <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{zipStatus}</p>
                            </div>
                            <button onClick={() => setZipStatus("")} className="text-gray-500 hover:text-white"><X size={16} /></button>
                        </div>
                    </div>
                )
            }
        </div >
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
