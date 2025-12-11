import { Seat, Session, Zone } from "@/types";

// Explicit configuration for every row based on user's exact specification
const ROW_DEFINITIONS = [
    // PREFERENTE (Rows 1-9)
    { row: 1, maxLeft: 27, maxRight: 28, zone: 'Preferente' },
    { row: 2, maxLeft: 29, maxRight: 30, zone: 'Preferente' },
    { row: 3, maxLeft: 31, maxRight: 32, zone: 'Preferente' },
    { row: 4, maxLeft: 31, maxRight: 32, zone: 'Preferente' },
    { row: 5, maxLeft: 31, maxRight: 32, zone: 'Preferente' },
    { row: 6, maxLeft: 31, maxRight: 32, zone: 'Preferente' },
    { row: 7, maxLeft: 31, maxRight: 32, zone: 'Preferente' },
    { row: 8, maxLeft: 33, maxRight: 34, zone: 'Preferente' },
    { row: 9, maxLeft: 33, maxRight: 34, zone: 'Preferente' }, // PMR are 31, 33 (L) and 32, 34 (R)

    // ZONA 2 (Rows 10-18)
    { row: 10, maxLeft: 35, maxRight: 36, zone: 'Zona 2' },
    { row: 11, maxLeft: 35, maxRight: 36, zone: 'Zona 2' },
    { row: 12, maxLeft: 37, maxRight: 38, zone: 'Zona 2' },
    { row: 13, maxLeft: 37, maxRight: 38, zone: 'Zona 2' },
    { row: 14, maxLeft: 37, maxRight: 38, zone: 'Zona 2' },
    { row: 15, maxLeft: 39, maxRight: 38, zone: 'Zona 2' },
    { row: 16, maxLeft: 39, maxRight: 40, zone: 'Zona 2' },
    { row: 17, maxLeft: 39, maxRight: 40, zone: 'Zona 2' },
    { row: 18, maxLeft: 39, maxRight: 40, zone: 'Zona 2' },

    // ZONA 3 (Rows 19-27)
    { row: 19, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 20, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 21, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 22, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 23, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 24, maxLeft: 43, maxRight: 44, zone: 'Zona 3' },
    { row: 25, maxLeft: 21, maxRight: 22, zone: 'Zona 3' },
    { row: 26, maxLeft: 21, maxRight: 22, zone: 'Zona 3' },
    { row: 27, maxLeft: 21, maxRight: 22, zone: 'Zona 3' },
] as const;

function generateSeats(): Seat[] {
    const seats: Seat[] = [];

    ROW_DEFINITIONS.forEach(config => {
        // Generate Left Side (Odds) - 1, 3, 5... up to maxLeft
        for (let i = 1; i <= config.maxLeft; i += 2) {
            let type: Seat['type'] = 'standard';
            let zone = config.zone as Zone;

            // SPECIAL CASE: Row 9 PMR Seats (Left: 31, 33)
            if (config.row === 9 && (i === 31 || i === 33)) {
                type = 'pmr';
                zone = 'PMR';
            }

            seats.push({
                id: `R${config.row}-${i}`,
                zone: zone,
                row: config.row,
                number: i,
                status: 'available',
                type: type
            });
        }

        // Generate Right Side (Evens) - 2, 4, 6... up to maxRight
        for (let i = 2; i <= config.maxRight; i += 2) {
            let type: Seat['type'] = 'standard';
            let zone = config.zone as Zone;

            // SPECIAL CASE: Row 9 PMR Seats (Right: 32, 34)
            if (config.row === 9 && (i === 32 || i === 34)) {
                type = 'pmr';
                zone = 'PMR';
            }

            seats.push({
                id: `R${config.row}-${i}`,
                zone: zone,
                row: config.row,
                number: i,
                status: 'available',
                type: type
            });
        }
    });

    return seats;
}

export const initialSeats = generateSeats();

export const sessions: Session[] = [
    {
        id: 'morning',
        name: 'Sesión Mañana',
        date: '2026-06-20',
        totalSeats: initialSeats.length,
        soldCount: 0
    },
    {
        id: 'afternoon',
        name: 'Sesión Tarde',
        date: '2026-06-20',
        totalSeats: initialSeats.length,
        soldCount: 0
    }
];
