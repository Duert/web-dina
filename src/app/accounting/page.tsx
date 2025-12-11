import { createClient } from "@supabase/supabase-js";
import { confirmOrderPayment, cancelOrder, cleanupExpiredOrders } from "@/app/actions";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2, Users } from "lucide-react";
import ExportButton from "@/components/export-button";
import { AdminSeatMapModal } from "@/components/admin-seat-map-modal";
import { initialSeats } from "@/lib/data";
import { Seat } from "@/types";

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return <div className="p-8 text-center text-red-500">Error: Faltan las credenciales de administrador (Service Role Key).</div>;
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Fetch all data in parallel using Admin privileges
        const [ordersResult, ticketsResult] = await Promise.all([
            supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('tickets').select('*')
        ]);

        if (ordersResult.error) throw ordersResult.error;
        if (ticketsResult.error) throw ticketsResult.error;

        const orders = ordersResult.data;
        const tickets = ticketsResult.data;


        // Order Calculations
        const totalRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0) || 0;
        const pendingRevenue = orders?.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + o.total_amount, 0) || 0;
        const totalOrders = orders?.filter(o => o.payment_status === 'paid' || o.payment_status === 'pending').length || 0;

        // Session Calculations
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
            // Calculate revenue from sold tickets only
            const revenue = sessionTickets
                .filter(t => t.status === 'sold')
                .reduce((sum, t) => sum + (t.price || 0), 0);

            return { seats, soldCount, revenue };
        };

        const morningStats = processSession('morning');
        const afternoonStats = processSession('afternoon');

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

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-slate-500 text-sm font-semibold uppercase">Ingresos Confirmados</h3>
                            <p className="text-3xl font-bold text-green-600 mt-2">{totalRevenue}€</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-slate-500 text-sm font-semibold uppercase">Pendiente de Cobro</h3>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingRevenue}€</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-slate-500 text-sm font-semibold uppercase">Total Reservas</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{totalOrders}</p>
                        </div>
                    </div>

                    {/* Session Occupancy & Maps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Morning Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-blue-500" />
                                    Sesión Mañana
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Butacas Vendidas</p>
                                        <p className="text-4xl font-black text-slate-900 mt-1">
                                            {morningStats.soldCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{morningStats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionName="Sesión Mañana (10:00h)"
                                seats={morningStats.seats}
                                stats={{ sold: morningStats.soldCount, total: initialSeats.length, revenue: morningStats.revenue }}
                            />
                        </div>

                        {/* Afternoon Session */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-slate-900 font-bold flex items-center gap-2 text-lg">
                                    <Users className="text-pink-500" />
                                    Sesión Tarde
                                </h3>
                                <div className="mt-4 flex justify-between items-end border-b pb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Butacas Vendidas</p>
                                        <p className="text-4xl font-black text-slate-900 mt-1">
                                            {afternoonStats.soldCount} <span className="text-lg text-slate-400 font-medium">/ {initialSeats.length}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Recaudación</p>
                                        <p className="text-xl font-bold text-green-600">{afternoonStats.revenue}€</p>
                                    </div>
                                </div>
                            </div>
                            <AdminSeatMapModal
                                sessionName="Sesión Tarde (15:30h)"
                                seats={afternoonStats.seats}
                                stats={{ sold: afternoonStats.soldCount, total: initialSeats.length, revenue: afternoonStats.revenue }}
                            />
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800">Listado de Pedidos</h2>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b">
                                <tr>
                                    <th className="px-6 py-3">Referencia</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders?.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-600">{order.id.split('-')[0].toUpperCase()}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{order.customer_name}</div>
                                            <div className="text-xs text-slate-500">{order.customer_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(order.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{order.total_amount}€</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={order.payment_status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {order.payment_status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <form action={async () => {
                                                        'use server';
                                                        await confirmOrderPayment(order.id);
                                                    }}>
                                                        <button title="Confirmar Pago" className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-200 transition-all">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    </form>
                                                    <form action={async () => {
                                                        'use server';
                                                        await cancelOrder(order.id);
                                                    }}>
                                                        <button title="Cancelar / Liberar" className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all">
                                                            <XCircle size={18} />
                                                        </button>
                                                    </form>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!orders || orders.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                            No hay pedidos registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
