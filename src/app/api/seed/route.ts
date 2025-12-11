
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { initialSeats } from '@/lib/data';

export async function GET() {
    try {
        // 1. Sessions
        const { error: sessionsError } = await supabase
            .from('sessions')
            .upsert([
                { id: 'morning', name: 'Sesión Mañana', date: '2026-03-01 10:00:00+00' },
                { id: 'afternoon', name: 'Sesión Tarde', date: '2026-03-01 15:30:00+00' }
            ], { onConflict: 'id' });

        if (sessionsError) throw new Error(`Sessions Error: ${sessionsError.message}`);

        // 2. Seats (Batched to avoid timeouts/limits)
        // Supabase can handle 1000 rows easily, but let's be safe.
        const seatRows = initialSeats.map(s => ({
            id: s.id,
            row_number: s.row,
            number: s.number,
            zone: s.zone,
            type: s.type
        }));

        const { error: seatsError } = await supabase
            .from('seats')
            .upsert(seatRows, { onConflict: 'id' });

        if (seatsError) throw new Error(`Seats Error: ${seatsError.message}`);

        // 3. Tickets (Availability for each session)
        // We need to generate a ticket for every seat for 'morning' and every seat for 'afternoon'
        const cleanTickets = [];

        // Morning
        for (const seat of initialSeats) {
            cleanTickets.push({ session_id: 'morning', seat_id: seat.id, status: 'available' });
        }
        // Afternoon
        for (const seat of initialSeats) {
            cleanTickets.push({ session_id: 'afternoon', seat_id: seat.id, status: 'available' });
        }

        // Upsert tickets: on conflict (session_id, seat_id) do nothing (preserve status if existing)
        const { error: ticketsError } = await supabase
            .from('tickets')
            .upsert(cleanTickets, { onConflict: 'session_id, seat_id', ignoreDuplicates: true });

        if (ticketsError) throw new Error(`Tickets Error: ${ticketsError.message}`);

        return NextResponse.json({ success: true, message: `Seeded ${initialSeats.length} seats and initialized tickets.` });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
