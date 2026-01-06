export type Zone = 'Preferente' | 'Zona 2' | 'Zona 3' | 'PMR';

export interface Seat {
    id: string; // e.g., "P-1-5" (Zone-Row-Number)
    zone: Zone;
    row: number;
    number: number;
    status: 'available' | 'sold' | 'reserved' | 'blocked';
    type: 'standard' | 'pmr';
    price?: number;
}

export interface Order {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    total_amount: number;
    created_at: string;
    tickets: Ticket[];
}

// Group Registration Types
export type DanceCategory = 'Baby' | 'Infantil' | 'Junior' | 'Mini-parejas' | 'Juvenil' | 'Absoluta' | 'Parejas' | 'Premium';

export interface Registration {
    id?: string; // Optional because it's generated on DB
    group_name: string;
    category: DanceCategory;
    payment_proof_url?: string; // @deprecated use payment_proof_urls
    payment_proof_urls?: string[]; // [NEW] Multiple proofs
    music_file_url?: string; // Link to uploaded MP3/Audio
    notes?: string; // [NEW] Notes to organization
    created_at?: string;
    user_id?: string;
    status: 'draft' | 'submitted';
    school_name?: string;
}

export interface RegistrationResponsible {
    id?: string;
    registration_id?: string;
    name: string;
    surnames: string;
    phone: string;
    email: string;
    dni_url?: string; // [NEW] DNI Upload
}

export interface RegistrationParticipant {
    id?: string;
    registration_id?: string;
    name: string;
    surnames: string;
    dob: string; // YYYY-MM-DD
    num_tickets: number;
    authorization_url?: string;
    dni_url?: string; // [NEW] DNI Upload
}

export interface Ticket {
    id: string;
    seat_id: string;
    session_id: 'morning' | 'afternoon';
    customer_name?: string;
    price: number;
    created_at: string;
    registration_id?: string;
    status: 'available' | 'sold' | 'reserved' | 'blocked';
}

export interface Session {
    id: 'morning' | 'afternoon';
    name: string;
    date: string;
    totalSeats: number;
    soldCount: number;
}
