import { supabase } from "@/lib/supabase";
import { confirmOrderPayment, cancelOrder, cleanupExpiredOrders } from "@/app/actions";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import ExportButton from "@/components/export-button";

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
    // Fetch all orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return <div>Error loading orders: {error.message}</div>;
    }

    // Calculations
    const totalRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const pendingRevenue = orders?.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const totalOrders = orders?.filter(o => o.payment_status === 'paid' || o.payment_status === 'pending').length || 0;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors">
                            <ArrowLeft size={16} className="mr-1" /> Volver al Inicio
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900">Panel de Control & Contabilidad</h1>
                    </div>

                    <div className="flex gap-3">
                        <ExportButton orders={orders || []} />

                        <form action={cleanupExpiredOrders}>
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
                                                <form action={confirmOrderPayment.bind(null, order.id)}>
                                                    <button title="Confirmar Pago" className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-200 transition-all">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                </form>
                                                <form action={cancelOrder.bind(null, order.id)}>
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
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"><CheckCircle size={12} /> Pagado</span>;
    if (status === 'pending') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800"><Clock size={12} /> Pendiente</span>;
    if (status === 'cancelled') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800"><XCircle size={12} /> Cancelado</span>;
    if (status === 'expired') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><Trash2 size={12} /> Caducado</span>;
    return <span className="text-gray-500">{status}</span>;
}
