import { Seat, Session, Zone } from "@/types";

// New Layout Configuration
// PATI BUTAQUES: Rows 1-17
// - Rows 1-17: 20 seats (10 | GAP | 10)

// ANFITEATRE: Rows 18-25
// - Rows 18-21 (Fila 1-4): 24 seats (6 | GAP | 12 | GAP | 6)
// - Rows 22-25 (Fila 5-8): 16 seats (4 | GAP | 8 | GAP | 4)

const SEAT_CONFIG = [
    // --- PATI BUTAQUES (Main Floor) ---
    // Zone: Preferente (Rows 1-10)
    { startRow: 1, endRow: 10, seatsPerRow: 20, zone: 'Preferente' as Zone },
    // Zone: Zona 2 (Rows 11-17)
    { startRow: 11, endRow: 17, seatsPerRow: 20, zone: 'Zona 2' as Zone },

    // --- ANFITEATRE (Balcony) ---
    // Zone: Zona 3 (Rows 18-21 / Fila 1-4)
    { startRow: 18, endRow: 21, seatsPerRow: 24, zone: 'Zona 3' as Zone },
    // Zone: Zona 3 (Rows 22-25 / Fila 5-8)
    { startRow: 22, endRow: 25, seatsPerRow: 16, zone: 'Zona 3' as Zone },
];

function generateSeats(): Seat[] {
    const seats: Seat[] = [];

    SEAT_CONFIG.forEach(config => {
        for (let r = config.startRow; r <= config.endRow; r++) {
            for (let n = 1; n <= config.seatsPerRow; n++) {
                let type: Seat['type'] = 'standard';
                let zone = config.zone;

                // PMR Logic: Row 1, Seats 1-3 and 18-20
                if (r === 1 && (n <= 3 || n >= 18)) {
                    type = 'pmr';
                    zone = 'PMR';
                }

                seats.push({
                    id: `R${r}-${n}`,
                    zone: zone,
                    row: r,
                    number: n,
                    status: 'available',
                    type: type
                });
            }
        }
    });

    return seats;
}

export const initialSeats = generateSeats();

export const sessions: Session[] = [
    {
        id: 'block1',
        name: 'Bloque 1',
        date: '2026-03-29T09:00:00',
        totalSeats: initialSeats.length,
        soldCount: 0,
        categoryRows: [
            ['Infantil', 'Infantil Mini-parejas']
        ]
    },
    {
        id: 'block2',
        name: 'Bloque 2',
        date: '2026-03-29T10:45:00',
        totalSeats: initialSeats.length,
        soldCount: 0,
        categoryRows: [
            ['Junior', 'Junior Mini-parejas', 'Mini-Solistas Junior']
        ]
    },
    {
        id: 'block3',
        name: 'Bloque 3',
        date: '2026-03-29T15:00:00',
        totalSeats: initialSeats.length,
        soldCount: 0,
        categoryRows: [
            ['Juvenil', 'Juvenil Parejas']
        ]
    },
    {
        id: 'block4',
        name: 'Bloque 4',
        date: '2026-03-29T16:45:00',
        totalSeats: initialSeats.length,
        soldCount: 0,
        categoryRows: [
            ['Absoluta', 'Parejas', 'Solistas Absoluta', 'Premium']
        ]
    }
];
