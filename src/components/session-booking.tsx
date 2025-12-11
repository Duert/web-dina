"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { SeatMap } from "@/components/seat-map";
import { Seat, Session } from "@/types";
import { cn } from "@/lib/utils";

// Mock pricing - In a real app this could also come from DB
// Updated to single price as per client request
const PRICES = {
    'Preferente': 5,
    'Zona 2': 5,
    'Zona 3': 5,
    'PMR': 5
};

interface SessionBookingProps {
    session: Session;
    initialSeats: Seat[]; // These already have the correct status merged from DB
}

export default function SessionBooking({ session, initialSeats }: SessionBookingProps) {
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Checkout State
    const [showCheckout, setShowCheckout] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [orderId, setOrderId] = useState<string | null>(null); // If set, showing success

    // We use the passed seats which already have DB status (sold/available)
    // We don't need a state for 'allSeats' unless we plan to update them via realtime, 
    // but for MVP static props are fine.

    const toggleSeat = (seat: Seat) => {
        if (selectedSeats.find(s => s.id === seat.id)) {
            setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
        } else {
            setSelectedSeats(prev => [...prev, seat]);
        }
    };

    const totalAmount = selectedSeats.reduce((acc, seat) => acc + (PRICES[seat.zone as keyof typeof PRICES] || 0), 0);

    const handleInitialClick = () => {
        setShowCheckout(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            // We need to import the action from a client component, typically via props or direct import if supported.
            // In Next.js App Router, direct import of server actions works.
            const { purchaseTickets } = await import("@/app/actions");

            const result = await purchaseTickets(session.id, selectedSeats.map(s => s.id), {
                ...formData,
                total: totalAmount
            });

            if (result.success) {
                setOrderId(result.orderId || 'PENDIENTE');
                setSelectedSeats([]); // Clear cart (visual only, page will revalidate)
                // The page will automatically refresh due to revalidatePath in the action
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Ha ocurrido un error inesperado.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            {/* Sidebar / Cart */}
            <aside className="w-96 bg-slate-50 border-r flex flex-col shadow-xl z-20 relative">
                <div className="p-6 border-b bg-white">
                    <Link href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-1" /> Volver
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">{session.name}</h1>
                    <p className="text-slate-500 text-sm capitalize">
                        {new Date(session.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}h
                    </p>
                </div>

                {/* SUCCESS SCREEN */}
                {orderId ? (
                    <div className="p-8 flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <ShoppingCart size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Reserva Creada!</h2>
                        <p className="text-slate-500 mb-6">Tu pedido ha sido registrado correctamente.</p>

                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-left w-full mb-6">
                            <p className="font-bold text-yellow-800 text-sm mb-2">Instrucciones de Pago:</p>
                            <p className="text-sm text-yellow-800 mb-1">Haz un Bizum o Transferencia indicando:</p>
                            <div className="font-mono bg-white p-2 rounded border text-center text-lg tracking-widest my-2 select-all">
                                {orderId.split('-')[0].toUpperCase()}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Manda el comprobante al 600 000 000</p>
                        </div>

                        <button
                            onClick={() => { setOrderId(null); setShowCheckout(false); setFormData({ name: '', email: '', phone: '' }); }}
                            className="text-slate-500 underline text-sm"
                        >
                            Volver al mapa
                        </button>
                    </div>
                ) : showCheckout ? (
                    /* CHECKOUT FORM */
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 animate-in slide-in-from-right">
                        <h2 className="font-bold text-lg mb-4">Tus Datos</h2>
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Nombre Completo</label>
                                <input
                                    required
                                    className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900 focus:border-black focus:ring-0"
                                    placeholder="Juan Pérez"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Email</label>
                                <input
                                    required type="email"
                                    className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900 focus:border-black focus:ring-0"
                                    placeholder="juan@ejemplo.com"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Teléfono</label>
                                <input
                                    required type="tel"
                                    className="w-full p-2 border-2 border-slate-300 rounded-md bg-white text-slate-900 focus:border-black focus:ring-0"
                                    placeholder="600 00 00 00"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-600 font-medium">Total a pagar</span>
                                    <span className="font-black text-2xl text-slate-900">{totalAmount}€</span>
                                </div>
                                <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded border border-slate-200">
                                    * El pago se realizará manualmente mediante Bizum/Transferencia tras confirmar.
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 space-y-2">
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 flex justify-center"
                            >
                                {isProcessing ? "Procesando..." : "Finalizar Reserva"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCheckout(false)}
                                disabled={isProcessing}
                                className="w-full py-2 text-slate-500 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                ) : (
                    /* CART VIEW */
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                                <ShoppingCart size={18} />
                                Entradas Seleccionadas ({selectedSeats.length})
                            </h2>

                            {selectedSeats.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-lg">
                                    Selecciona butacas en el mapa
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedSeats.map(seat => (
                                        <div key={seat.id} className="bg-white p-3 rounded-lg border shadow-sm flex justification-between items-center group">
                                            <div>
                                                <div className="font-bold text-slate-800">Fila {seat.row} - Asiento {seat.number}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wide">{seat.zone}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900">{PRICES[seat.zone as keyof typeof PRICES]}€</div>
                                                <button
                                                    onClick={() => toggleSeat(seat)}
                                                    className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t space-y-4">
                            <div className="flex justify-between items-center text-lg">
                                <span className="font-semibold text-slate-700">Total</span>
                                <span className="font-bold text-2xl text-slate-900">{totalAmount}€</span>
                            </div>
                            <button
                                onClick={handleInitialClick}
                                disabled={selectedSeats.length === 0}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                            >
                                Confirmar Compra
                            </button>
                            {/* Dev helper to clear selection */}
                            <button onClick={() => setSelectedSeats([])} className="w-full text-xs text-slate-400 hover:text-slate-600">
                                Limpiar selección
                            </button>
                        </div>
                    </>
                )}
            </aside>

            {/* Main Content - Map */}
            <main className="flex-1 bg-slate-100 relative flex flex-col">
                <SeatMap
                    seats={initialSeats}
                    selectedSeats={selectedSeats}
                    onSeatToggle={toggleSeat}
                />
            </main>
        </div>
    );
}
