import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase-server";
import { confirmOrderPayment, cancelOrder, cleanupExpiredOrders } from "@/app/actions";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2, Users } from "lucide-react";
import ExportButton from "@/components/export-button";
import { AdminSeatMapModal } from "@/components/admin-seat-map-modal";
import { PDFDownloadButton } from "@/components/pdf-download-button";
import { initialSeats, sessions } from "@/lib/data";
import { Seat } from "@/types";
import { getSchoolsStatsAction } from "@/app/actions-admin";

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return <div className="p-8 text-center text-red-500">Error: Faltan las credenciales de administrador (Service Role Key).</div>;
        }

        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Fetch all data in parallel using Admin privileges
        // Fetch tickets using pagination to bypass the 1000/5000 row limits
        const fetchAllTickets = async () => {
            let allTickets: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;
            while (hasMore) {
                const { data, error } = await supabaseAdmin
                    .from('tickets')
                    .select('*')
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                if (error) throw error;
                if (data && data.length > 0) {
                    allTickets = [...allTickets, ...data];
                    if (data.length < pageSize) hasMore = false;
                } else {
                    hasMore = false;
                }
                page++;
            }
            return { data: allTickets, error: null };
        };

        const [ordersResult, ticketsResult, registrationsResult] = await Promise.all([
            supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
            fetchAllTickets(),
            supabaseAdmin.from('registrations')
                .select('*, registration_participants(*), registration_responsibles(*)')
        ]);

        if (ordersResult.error) throw ordersResult.error;
        if (ticketsResult.error) throw ticketsResult.error;
        if (registrationsResult.error) throw registrationsResult.error;

        const orders = ordersResult.data;
        const tickets = ticketsResult.data;
        const registrations = registrationsResult.data;

        const schoolStatsResult = await getSchoolsStatsAction();
        const schoolStats = schoolStatsResult.success ? (schoolStatsResult.data as any[]) : [];


        const PRICE_DANCER = 3.5;
        const PRICE_TICKET = 3;

        // Order Calculations (Online Sales)
        const onlineRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0) || 0;
        const onlinePending = orders?.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + o.total_amount, 0) || 0;
        const totalOrders = orders?.filter(o => o.payment_status === 'paid' || o.payment_status === 'pending').length || 0;

        // Registration & Dancer Calculations
        // Financials from Registrations (Detailed)
        let dancersRevenueConfirmed = 0;
        let dancersRevenuePending = 0;
        let ticketsRevenueConfirmed = 0;
        let ticketsRevenuePending = 0;
        // Legacy total vars will be sums of these

        // These will be calculated during breakdown iteration to ensure consistency
        let totalDancers = 0;
        let possibleDancers = 0;
        let confirmedTickets = 0;
        let totalTicketsAssigned = 0; // [NEW] Includes all submitted + manual (sold/assigned)
        let possibleTickets = 0;



        // Session Calculations
        // Helper to get block name
        const getBlockName = (category: string) => {
            const session = sessions.find(s => s.categoryRows.flat().includes(category));
            return session ? session.name : "Desconocido";
        };

        // Aggregation for Breakdown Table
        const breakdown: Record<string, Record<string, {
            dancers_confirmed: number,
            dancers_draft: number,
            tickets_confirmed: number,
            tickets_draft: number
        }>> = {};

        const uniqueDancersByBlock = { block1: new Set<string>(), block2: new Set<string>(), block3: new Set<string>(), block4: new Set<string>() };
        const uniqueResponsiblesByBlock = { block1: new Set<string>(), block2: new Set<string>(), block3: new Set<string>(), block4: new Set<string>() };
        const grossDancersByBlock = { block1: 0, block2: 0, block3: 0, block4: 0 };
        const grossResponsiblesByBlock = { block1: 0, block2: 0, block3: 0, block4: 0 };

        const getBlockKeyFromCategory = (category: string) => {
            const b1 = ['Infantil', 'Infantil Mini-parejas', 'Mini-Solistas Infantil'];
            const b2 = ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior'];
            const b3 = ['Juvenil', 'Juvenil Parejas', 'Solistas Juvenil'];
            const b4 = ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium'];
            if (b1.includes(category)) return 'block1';
            if (b2.includes(category)) return 'block2';
            if (b3.includes(category)) return 'block3';
            if (b4.includes(category)) return 'block4';
            return null;
        };

        registrations?.forEach(reg => {
            const block = getBlockName(reg.category);
            const cat = reg.category;

            if (!breakdown[block]) breakdown[block] = {};
            if (!breakdown[block][cat]) breakdown[block][cat] = { dancers_confirmed: 0, dancers_draft: 0, tickets_confirmed: 0, tickets_draft: 0 };

            const participantsArr = reg.registration_participants || [];
            const responsiblesArr = reg.registration_responsibles || [];

            const participants = participantsArr.length;
            const tickets = participantsArr.reduce((s: number, p: any) => s + (p.num_tickets || 0), 0) || 0;

            const dancersVal = participants * PRICE_DANCER;
            const ticketsVal = tickets * PRICE_TICKET;
            // const regValue = dancersVal + ticketsVal;

            if (reg.status === 'draft') {
                breakdown[block][cat].dancers_draft += participants;
                breakdown[block][cat].tickets_draft += tickets;

                // Add to globals (Pending)
                possibleDancers += participants;
                possibleTickets += tickets;
                dancersRevenuePending += dancersVal;
                ticketsRevenuePending += ticketsVal;
            } else {
                breakdown[block][cat].dancers_confirmed += participants;
                // [FIX] Include submitted tickets in breakdown count (Real Assigned)
                breakdown[block][cat].tickets_confirmed += tickets;

                // Add to globals
                totalDancers += participants;
                totalTicketsAssigned += tickets; // [FIX] Count for KPI card (Real Assigned)

                if (reg.is_confirmed) {
                    // Add to globals (Confirmed Revenue/Stats)
                    confirmedTickets += tickets;
                    dancersRevenueConfirmed += dancersVal;
                    ticketsRevenueConfirmed += ticketsVal;
                } else {
                    // Submitted but not confirmed -> pending revenue
                    dancersRevenuePending += dancersVal;
                    ticketsRevenuePending += ticketsVal;
                }

                // Add to Global Block Aggregation (Gross & Unique sums) only if not draft
                const blockKey = getBlockKeyFromCategory(reg.category);
                if (blockKey) {
                    grossDancersByBlock[blockKey as keyof typeof grossDancersByBlock] += participantsArr.length;
                    grossResponsiblesByBlock[blockKey as keyof typeof grossResponsiblesByBlock] += responsiblesArr.length;

                    participantsArr.forEach((p: any) => {
                        const key = `${p.name?.trim().toLowerCase()}-${p.surnames?.trim().toLowerCase()}`;
                        if (key && key !== '-') uniqueDancersByBlock[blockKey as keyof typeof uniqueDancersByBlock].add(key);
                    });
                    responsiblesArr.forEach((r: any) => {
                        const key = `${r.name?.trim().toLowerCase()}-${r.surnames?.trim().toLowerCase()}`;
                        if (key && key !== '-') uniqueResponsiblesByBlock[blockKey as keyof typeof uniqueResponsiblesByBlock].add(key);
                    });
                }
            }
        });

        // Process Manual / Online Tickets (Not linked to registrations)
        const nonRegTickets = tickets?.filter(t => !t.registration_id && t.status === 'sold') || [];

        nonRegTickets.forEach(t => {
            // Determine Block
            const session = sessions.find(s => s.id === t.session_id);
            const blockName = session ? session.name : "Desconocido";

            // Determine Category (Fake category for breakdown)
            const isFree = (t.price || 0) === 0;
            const categoryName = isFree ? "Organización / Invitaciones" : "Entradas Sueltas (Web)";

            if (!breakdown[blockName]) breakdown[blockName] = {};
            if (!breakdown[blockName][categoryName]) {
                breakdown[blockName][categoryName] = {
                    dancers_confirmed: 0,
                    dancers_draft: 0,
                    tickets_confirmed: 0,
                    tickets_draft: 0
                };
            }

            // Increment Ticket Count
            breakdown[blockName][categoryName].tickets_confirmed += 1;
            confirmedTickets += 1;
            totalTicketsAssigned += 1; // [FIX] Include manual/online in assigned count

            // Revenue is NOT added here because:
            // 1. Organization tickets match user requirement "no tienen coste".
            // 2. Online/Paid tickets are calculated via 'onlineRevenue' (from orders table) or 'totalRevenue'.
            // wait, totalRevenue = onlineRevenue + registrationRevenue.
            // If these 'Venta Online' tickets correspond to orders, their money is in onlineRevenue.
            // If they are manual sales physically paid, we might be missing them if not in 'orders'.
            // But usually Admin manual assigns are free.
            // Let's assume for now revenue is handled by orders/registrations.
        });

        const totalRevenue = onlineRevenue + dancersRevenueConfirmed + ticketsRevenueConfirmed;
        const totalPending = onlinePending + dancersRevenuePending + ticketsRevenuePending;
        const processSession = (sessionId: string) => {
            const sessionTickets = tickets?.filter(t => t.session_id === sessionId) || [];

            // Map Status
            const ticketMap = new Map();
            sessionTickets.forEach(t => ticketMap.set(t.seat_id, t.status));

            const seats: Seat[] = initialSeats.map(seat => ({
                ...seat,
                status: ticketMap.get(seat.id) || 'available'
            }));

            const soldCount = sessionTickets.filter(t => t.status === 'sold').length;
            const blockedCount = sessionTickets.filter(t => t.status === 'blocked').length;
            const occupiedCount = soldCount + blockedCount;
            const availableCount = initialSeats.length - occupiedCount;

            // Calculate revenue from sold tickets only
            const revenue = sessionTickets
                .filter(t => t.status === 'sold')
                .reduce((sum, t) => sum + PRICE_TICKET, 0); // Force 3€ (PRICE_TICKET) always

            return { seats, soldCount, blockedCount, occupiedCount, availableCount, revenue };
        };

        const block1Stats = processSession('block1');
        const block2Stats = processSession('block2');
        const block3Stats = processSession('block3');
        const block4Stats = processSession('block4');

        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <Link href="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                                <ArrowLeft size={16} className="mr-1" /> Volver al Panel
                            </Link>
                            <h1 className="text-3xl font-bold text-slate-900">Panel de Control & Contabilidad</h1>
                        </div>

                        <div className="flex gap-3">
                            <ExportButton orders={orders || []} />

                            <form action={async () => {
                                'use server';
                                await cleanupExpiredOrders();
                            }}>
                                <button type="submit" className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-200 flex items-center gap-2 h-full">
                                    <Trash2 size={16} />
                                    Limpiar Caducados (+24h)
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* KPI Cards: Finance */}
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Métricas Financieras</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 text-sm font-semibold uppercase">Ingresos Confirmados</h3>
                                <p className="text-3xl font-bold text-green-600 mt-2">{totalRevenue}€</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Bailarines:</span>
                                        <span className="font-bold">{dancersRevenueConfirmed}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Entradas (Grupos):</span>
                                        <span className="font-bold">{ticketsRevenueConfirmed}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Entradas (Web):</span>
                                        <span className="font-bold">{onlineRevenue}€</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 text-sm font-semibold uppercase">Pendiente de Cobro</h3>
                                <p className="text-3xl font-bold text-yellow-600 mt-2">{totalPending}€</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Bailarines (Borr/Pend):</span>
                                        <span className="font-bold">{dancersRevenuePending}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Entradas (Borr/Pend):</span>
                                        <span className="font-bold">{ticketsRevenuePending}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Entradas (Web Pend):</span>
                                        <span className="font-bold">{onlinePending}€</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-slate-500 text-sm font-semibold uppercase">Solicitudes Web</h3>
                                <p className="text-3xl font-bold text-slate-900 mt-2">{totalOrders}</p>
                                <p className="text-xs text-slate-400">Pedidos de entradas sueltas</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards: Registrations & Dancers */}
                    <div className="mb-10">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Inscripciones & Bailarines</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                                <h3 className="text-slate-500 text-[10px] font-bold uppercase">Bailarines Inscritos</h3>
                                <p className="text-2xl font-black text-slate-900 mt-1">{totalDancers}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Enviados (no borrador)</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-200">
                                <h3 className="text-slate-500 text-[10px] font-bold uppercase">Bailarines Posibles</h3>
                                <p className="text-2xl font-black text-slate-400 mt-1">{possibleDancers}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Actualmente en borrador</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
                                <h3 className="text-slate-500 text-sm font-bold uppercase">Entradas Asignadas</h3>
                                <p className="text-2xl font-black text-green-600 mt-1">{totalTicketsAssigned}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Inscripciones enviadas + Sueltas</p>
                            </div>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-200">
                                <h3 className="text-slate-500 text-[10px] font-bold uppercase">Entradas Posibles</h3>
                                <p className="text-2xl font-black text-slate-400 mt-1">{possibleTickets}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Solicitadas en borrador</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards: Global Block Attendance (Gross vs Unique) */}
                    <div className="mb-10">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Total Bailarines y Responsables por Bloque (Con vs Sin Duplicidades)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {['block1', 'block2', 'block3', 'block4'].map((b, idx) => {
                                const bp = b as keyof typeof grossDancersByBlock;
                                const bn = `Bloque ${idx + 1}`;
                                return (
                                    <div key={b} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="text-slate-500 font-bold uppercase mb-3 flex items-center justify-between">
                                            <span>{bn}</span>
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Bailarines</span>
                                                    <span className="text-xs text-slate-400 font-medium">Inscritos Totales</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-slate-900 leading-none">{grossDancersByBlock[bp]}</p>
                                                    <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1 justify-end mt-1"><CheckCircle size={10} /> {uniqueDancersByBlock[bp].size} únicos</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Responsables</span>
                                                    <span className="text-xs text-slate-400 font-medium">Inscritos Totales</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-slate-900 leading-none">{grossResponsiblesByBlock[bp]}</p>
                                                    <p className="text-[10px] text-purple-500 font-bold flex items-center gap-1 justify-end mt-1"><CheckCircle size={10} /> {uniqueResponsiblesByBlock[bp].size} únicos</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Session Occupancy & Maps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Morning 1 Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-blue-500" />
                                    Bloque 1
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Disponibles</p>
                                            <p className="text-4xl font-black text-indigo-600 mt-1">
                                                {block1Stats.availableCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Ocupadas: <span className="text-slate-900">{block1Stats.occupiedCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Vendidas: <span className="text-green-600 font-bold">{block1Stats.soldCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Bloqueadas: <span className="text-red-500 font-bold">{block1Stats.blockedCount}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{block1Stats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionId="block1"
                                sessionName="Bloque 1"
                                seats={block1Stats.seats}
                                stats={{ sold: block1Stats.soldCount, blocked: block1Stats.blockedCount, occupied: block1Stats.occupiedCount, available: block1Stats.availableCount, total: initialSeats.length, revenue: block1Stats.revenue }}
                            />
                            <PDFDownloadButton
                                sessionId="block1"
                                sessionName="Bloque 1"
                                seats={block1Stats.seats}
                            />
                        </div>

                        {/* Morning 2 Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-blue-500" />
                                    Bloque 2
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Disponibles</p>
                                            <p className="text-4xl font-black text-indigo-600 mt-1">
                                                {block2Stats.availableCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Ocupadas: <span className="text-slate-900">{block2Stats.occupiedCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Vendidas: <span className="text-green-600 font-bold">{block2Stats.soldCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Bloqueadas: <span className="text-red-500 font-bold">{block2Stats.blockedCount}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{block2Stats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionId="block2"
                                sessionName="Bloque 2"
                                seats={block2Stats.seats}
                                stats={{ sold: block2Stats.soldCount, blocked: block2Stats.blockedCount, occupied: block2Stats.occupiedCount, available: block2Stats.availableCount, total: initialSeats.length, revenue: block2Stats.revenue }}
                            />
                            <PDFDownloadButton
                                sessionId="block2"
                                sessionName="Bloque 2"
                                seats={block2Stats.seats}
                            />
                        </div>

                        {/* Afternoon 1 Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-pink-500" />
                                    Bloque 3
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Disponibles</p>
                                            <p className="text-4xl font-black text-indigo-600 mt-1">
                                                {block3Stats.availableCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Ocupadas: <span className="text-slate-900">{block3Stats.occupiedCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Vendidas: <span className="text-green-600 font-bold">{block3Stats.soldCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Bloqueadas: <span className="text-red-500 font-bold">{block3Stats.blockedCount}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{block3Stats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionId="block3"
                                sessionName="Bloque 3"
                                seats={block3Stats.seats}
                                stats={{ sold: block3Stats.soldCount, blocked: block3Stats.blockedCount, occupied: block3Stats.occupiedCount, available: block3Stats.availableCount, total: initialSeats.length, revenue: block3Stats.revenue }}
                            />
                            <PDFDownloadButton
                                sessionId="block3"
                                sessionName="Bloque 3"
                                seats={block3Stats.seats}
                            />
                        </div>

                        {/* Afternoon 2 Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-pink-500" />
                                    Bloque 4
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold">Disponibles</p>
                                            <p className="text-4xl font-black text-indigo-600 mt-1">
                                                {block4Stats.availableCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Ocupadas: <span className="text-slate-900">{block4Stats.occupiedCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Vendidas: <span className="text-green-600 font-bold">{block4Stats.soldCount}</span></p>
                                            <p className="text-[10px] text-slate-500 font-medium">Bloqueadas: <span className="text-red-500 font-bold">{block4Stats.blockedCount}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{block4Stats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionId="block4"
                                sessionName="Bloque 4"
                                seats={block4Stats.seats}
                                stats={{ sold: block4Stats.soldCount, blocked: block4Stats.blockedCount, occupied: block4Stats.occupiedCount, available: block4Stats.availableCount, total: initialSeats.length, revenue: block4Stats.revenue }}
                            />
                            <PDFDownloadButton
                                sessionId="block4"
                                sessionName="Bloque 4"
                                seats={block4Stats.seats}
                            />
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800">Desglose por Bloque y Categoría</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Bloque</th>
                                        <th className="px-6 py-3">Categoría</th>
                                        <th className="px-6 py-3 text-center bg-blue-50/50">Bailarines<br />(Inscritos)</th>
                                        <th className="px-6 py-3 text-center bg-blue-100/50">Bailarines<br />(Posibles/Draft)</th>
                                        <th className="px-6 py-3 text-center bg-green-50/50">Entradas<br />(Asignadas)</th>
                                        <th className="px-6 py-3 text-center bg-green-100/50">Entradas<br />(Posibles/Draft)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(breakdown).sort().map(([blockName, categories]) => {
                                        // Calculate total for this block
                                        const blockTotal = Object.values(categories).reduce((acc, curr) => ({
                                            dancers_confirmed: acc.dancers_confirmed + curr.dancers_confirmed,
                                            dancers_draft: acc.dancers_draft + curr.dancers_draft,
                                            tickets_confirmed: acc.tickets_confirmed + curr.tickets_confirmed,
                                            tickets_draft: acc.tickets_draft + curr.tickets_draft
                                        }), { dancers_confirmed: 0, dancers_draft: 0, tickets_confirmed: 0, tickets_draft: 0 });

                                        return (
                                            <Fragment key={blockName}>
                                                {Object.entries(categories).sort().map(([catName, stats], idx) => (
                                                    <tr key={`${blockName}-${catName}`} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-3 font-medium text-slate-900">{blockName}</td>
                                                        <td className="px-6 py-3 text-slate-600">{catName}</td>
                                                        <td className="px-6 py-3 text-center font-bold text-slate-700 bg-blue-50/30">{stats.dancers_confirmed}</td>
                                                        <td className="px-6 py-3 text-center text-slate-400 bg-blue-100/30">{stats.dancers_draft}</td>
                                                        <td className="px-6 py-3 text-center font-bold text-green-600 bg-green-50/30">{stats.tickets_confirmed}</td>
                                                        <td className="px-6 py-3 text-center text-slate-400 bg-green-100/30">{stats.tickets_draft}</td>
                                                    </tr>
                                                ))}
                                                {/* Block Total Row */}
                                                <tr className="bg-slate-100 font-bold border-t border-slate-200 border-b-2 border-slate-300">
                                                    <td className="px-6 py-3 text-slate-800">{blockName}</td>
                                                    <td className="px-6 py-3 text-slate-800 text-right uppercase text-xs tracking-wider">Total Bloque</td>
                                                    <td className="px-6 py-3 text-center text-blue-800 bg-blue-100/50">{blockTotal.dancers_confirmed}</td>
                                                    <td className="px-6 py-3 text-center text-blue-600 bg-blue-200/50">{blockTotal.dancers_draft}</td>
                                                    <td className="px-6 py-3 text-center text-green-800 bg-green-100/50">{blockTotal.tickets_confirmed}</td>
                                                    <td className="px-6 py-3 text-center text-green-600 bg-green-200/50">{blockTotal.tickets_draft}</td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                    {Object.keys(breakdown).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                                No hay datos para mostrar
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Desglose por Escuelas (Aforo) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800">Desglose por Escuela (Bailarines y Responsables Únicos por Bloque)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[150px]">Escuela</th>
                                        <th className="px-4 py-3 text-center">B1</th>
                                        <th className="px-4 py-3 text-center bg-slate-50/50">B2</th>
                                        <th className="px-4 py-3 text-center">B3</th>
                                        <th className="px-4 py-3 text-center bg-slate-50/50">B4</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {schoolStats.map((school, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{school.school_name}</div>
                                                <div className="text-[10px] text-slate-400 uppercase">{school.rep_name} {school.rep_surnames}</div>
                                            </td>
                                            <td className="px-4 py-2 text-center align-top">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${(school.tickets_by_block?.block1 || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`} title="Entradas Totales">
                                                        🎟️ {school.tickets_by_block?.block1 || 0}
                                                    </span>
                                                    {(school.unique_participants_by_block?.block1 || 0) > 0 && (
                                                        <span className="text-[10px] text-blue-600 font-medium" title="Bailarines Únicos">👥 {school.unique_participants_by_block.block1}</span>
                                                    )}
                                                    {(school.unique_responsibles_by_block?.block1 || 0) > 0 && (
                                                        <span className="text-[10px] text-purple-600 font-medium" title="Responsables Únicos">👤 {school.unique_responsibles_by_block.block1}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center align-top bg-slate-50/30">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${(school.tickets_by_block?.block2 || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`} title="Entradas Totales">
                                                        🎟️ {school.tickets_by_block?.block2 || 0}
                                                    </span>
                                                    {(school.unique_participants_by_block?.block2 || 0) > 0 && (
                                                        <span className="text-[10px] text-blue-600 font-medium" title="Bailarines Únicos">👥 {school.unique_participants_by_block.block2}</span>
                                                    )}
                                                    {(school.unique_responsibles_by_block?.block2 || 0) > 0 && (
                                                        <span className="text-[10px] text-purple-600 font-medium" title="Responsables Únicos">👤 {school.unique_responsibles_by_block.block2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center align-top">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${(school.tickets_by_block?.block3 || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`} title="Entradas Totales">
                                                        🎟️ {school.tickets_by_block?.block3 || 0}
                                                    </span>
                                                    {(school.unique_participants_by_block?.block3 || 0) > 0 && (
                                                        <span className="text-[10px] text-blue-600 font-medium" title="Bailarines Únicos">👥 {school.unique_participants_by_block.block3}</span>
                                                    )}
                                                    {(school.unique_responsibles_by_block?.block3 || 0) > 0 && (
                                                        <span className="text-[10px] text-purple-600 font-medium" title="Responsables Únicos">👤 {school.unique_responsibles_by_block.block3}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center align-top bg-slate-50/30">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${(school.tickets_by_block?.block4 || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`} title="Entradas Totales">
                                                        🎟️ {school.tickets_by_block?.block4 || 0}
                                                    </span>
                                                    {(school.unique_participants_by_block?.block4 || 0) > 0 && (
                                                        <span className="text-[10px] text-blue-600 font-medium" title="Bailarines Únicos">👥 {school.unique_participants_by_block.block4}</span>
                                                    )}
                                                    {(school.unique_responsibles_by_block?.block4 || 0) > 0 && (
                                                        <span className="text-[10px] text-purple-600 font-medium" title="Responsables Únicos">👤 {school.unique_responsibles_by_block.block4}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {schoolStats.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                                No hay datos de escuelas para mostrar.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error: any) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 max-w-lg text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Error cargando Contabilidad</h2>
                    <p className="text-slate-500 mb-4">{error.message || "Error desconocido"}</p>
                    <Link href="/admin" className="text-blue-600 hover:underline">Volver al Admin</Link>
                </div>
            </div>
        );
    }
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"><CheckCircle size={12} /> Pagado</span>;
    if (status === 'pending') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800"><Clock size={12} /> Pendiente</span>;
    if (status === 'cancelled') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><XCircle size={12} /> Cancelado</span>;
    if (status === 'expired') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><Trash2 size={12} /> Caducado</span>;
    return <span className="text-gray-500">{status}</span>;
}
