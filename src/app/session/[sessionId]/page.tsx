import { createClient } from "@supabase/supabase-js";
import { initialSeats } from "@/lib/data";
import SessionBooking from "@/components/session-booking";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, User, Clock } from "lucide-react";
import { Seat, Session } from "@/types";

export const dynamic = 'force-dynamic'; // Ensure we always fetch fresh data

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params;

    // Create a fresh client for this request to avoid caching issues
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Fetch Session Info
    const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    // Check Sales Status
    const { data: settings } = await supabase
        .from('app_settings')
        .select('public_sales_enabled')
        .eq('id', 1)
        .single();

    if (!settings?.public_sales_enabled) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                    <Clock size={40} className="text-gray-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Venta Cerrada</h1>
                <p className="text-xl text-gray-400 max-w-lg mb-8">
                    La venta de entradas al público general aún no está disponible.
                    <br />Por favor, inténtalo más adelante.
                </p>
                <Link href="/" className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    if (sessionError || !sessionData) {
        console.error("Error fetching session:", sessionError);
        return notFound();
    }

    // 2. Fetch Tickets (Status)
    const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('seat_id, status')
        .eq('session_id', sessionId);

    if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        // Fallback to initial seats if error? Or fail? Let's fail safe.
    }

    // 3. Merge Layout with Status
    // Create a lookup map for speed
    const ticketMap = new Map();
    ticketsData?.forEach((t: any) => ticketMap.set(t.seat_id, t.status));

    const mergedSeats: Seat[] = initialSeats.map(seat => ({
        ...seat,
        status: ticketMap.get(seat.id) || 'available' // Default to available if not found (shouldn't happen if seeded)
    }));

    // Cast session data to our type (Supabase returns string dates usually)
    const session: Session = {
        id: sessionData.id,
        name: sessionData.name,
        date: sessionData.date,
        totalSeats: sessionData.total_seats,
        soldCount: ticketsData?.filter((t: any) => t.status === 'sold').length || 0
    };

    return <SessionBooking session={session} initialSeats={mergedSeats} />;
}
