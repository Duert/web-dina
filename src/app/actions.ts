'use server';

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

interface CustomerData {
    name: string;
    email: string;
    phone: string;
    total: number;
}

export async function purchaseTickets(sessionId: string, seatIds: string[], customer: CustomerData) {
    try {
        // 1. Verify availability first
        const { data: currentTickets, error: checkError } = await supabase
            .from('tickets')
            .select('seat_id, status')
            .eq('session_id', sessionId)
            .in('seat_id', seatIds);

        if (checkError) throw new Error(checkError.message);

        const alreadySold = currentTickets.some(t => t.status === 'sold');
        if (alreadySold) {
            return { success: false, message: 'Algunas de las butacas seleccionadas ya no están disponibles.' };
        }

        // 2. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                total_amount: customer.total,
                payment_status: 'pending',
                payment_provider: 'manual' // Bizum/Transfer
            })
            .select()
            .single();

        if (orderError) throw new Error("Error creating order: " + orderError.message);

        // 3. Update status to 'sold' and link to Order
        const { error: updateError } = await supabase
            .from('tickets')
            .update({
                status: 'sold',
                sold_at: new Date().toISOString(),
                order_id: order.id
            })
            .eq('session_id', sessionId)
            .in('seat_id', seatIds);

        if (updateError) throw new Error(updateError.message);

        // 4. Revalidate
        revalidatePath(`/session/${sessionId}`);

        return { success: true, message: 'Reserva creada correctament', orderId: order.id };

    } catch (error: any) {
        console.error("Purchase error:", error);
        return { success: false, message: 'Error al procesar la compra: ' + error.message };
    }
}

// --- ADMIN ACTIONS ---

export async function confirmOrderPayment(orderId: string) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', orderId);

        if (error) throw new Error(error.message);

        revalidatePath('/accounting');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function cancelOrder(orderId: string) {
    try {
        // 1. Release tickets
        const { error: ticketError } = await supabase
            .from('tickets')
            .update({ status: 'available', order_id: null, sold_at: null })
            .eq('order_id', orderId);

        if (ticketError) throw new Error(ticketError.message);

        // 2. Mark order as cancelled
        const { error: orderError } = await supabase
            .from('orders')
            .update({ payment_status: 'cancelled' })
            .eq('id', orderId);

        if (orderError) throw new Error(orderError.message);

        revalidatePath('/session/morning');
        revalidatePath('/session/afternoon');
        revalidatePath('/accounting');

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function cleanupExpiredOrders() {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // 1. Get expired order IDs
        const { data: expiredOrders, error: fetchError } = await supabase
            .from('orders')
            .select('id')
            .eq('payment_status', 'pending')
            .lt('created_at', yesterday);

        if (fetchError) throw new Error(fetchError.message);
        if (!expiredOrders || expiredOrders.length === 0) return { success: true, count: 0 };

        const ids = expiredOrders.map(o => o.id);

        // 2. Release tickets
        const { error: ticketError } = await supabase
            .from('tickets')
            .update({ status: 'available', order_id: null, sold_at: null })
            .in('order_id', ids);

        if (ticketError) throw new Error(ticketError.message);

        // 3. Mark orders as expired
        const { error: orderError } = await supabase
            .from('orders')
            .update({ payment_status: 'expired' })
            .in('id', ids);

        if (orderError) throw new Error(orderError.message);

        revalidatePath('/accounting');
        return { success: true, count: ids.length };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
