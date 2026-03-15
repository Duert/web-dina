export type Zone = 'Preferente' | 'Zona 2' | 'Zona 3' | 'PMR';

export interface Seat {
    id: string; // e.g., "P-1-5" (Zone-Row-Number)
    zone: Zone;
    row: number;
    number: number;
    status: 'available' | 'sold' | 'reserved' | 'blocked';
    type: 'standard' | 'pmr';
    price?: number;
    assignedTo?: string;
    groupName?: string;
    schoolName?: string;
    registration_id?: string | null; // For database tickets
    is_free?: boolean; // Whether ticket is free or paid
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
export type DanceCategory =
    | 'Infantil' | 'Infantil Mini-parejas' | 'Mini-Solistas Infantil'
    | 'Junior' | 'Junior Mini-parejas' | 'Mini-Solistas Junior'
    | 'Juvenil' | 'Juvenil Parejas' | 'Solistas Juvenil'
    | 'Absoluta' | 'Parejas' | 'Solistas Absoluta' | 'Premium'
    // Legacy support (optional, can be mapped or left if needed for old records, but user asked for these specific ones)
    | 'Mini-parejas'; // 'Mini-parejas' is now specific.


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
    status: 'draft' | 'submitted' | 'submitted_modifiable';
    school_name?: string;
    updated_at?: string; // [NEW] Last modification
    is_confirmed?: boolean; // [NEW] Confirmed by admin
    payment_verified?: boolean; // [NEW] Payment checked by admin
    original_category?: DanceCategory; // [NEW] Tracking modifications
    music_status?: 'pending' | 'received' | 'verified' | 'error'; // [NEW] Granular status
    order_index?: number; // [NEW] For custom ordering in competition
}

export interface RegistrationResponsible {
    id?: string;
    registration_id?: string;
    name: string;
    surnames: string;
    phone: string;
    email: string;
    dni_urls?: string[]; // [NEW] DNI Upload (Multiple)
}

export interface RegistrationParticipant {
    id?: string;
    registration_id?: string;
    name: string;
    surnames: string;
    dob: string; // YYYY-MM-DD
    num_tickets: number;
    authorization_url?: string; // @deprecated
    dni_url?: string; // @deprecated
    tutor_dni_url?: string; // @deprecated
    file_urls?: string[]; // @deprecated

    // New Structured Files
    authorization_urls?: string[];
    dni_urls?: string[];
    authorized_dni_urls?: string[];
}

export interface Ticket {
    id: string;
    seat_id: string;
    session_id: 'block1' | 'block2' | 'block3' | 'block4';
    customer_name?: string;
    price: number;
    created_at: string;
    registration_id?: string;
    status: 'available' | 'sold' | 'reserved' | 'blocked';
    assigned_to?: string; // Custom text for manually assigned tickets
    is_free?: boolean; // Whether ticket is free (true) or paid 3€ (false)
}

export interface Session {
    id: 'block1' | 'block2' | 'block3' | 'block4';
    name: string;
    date: string;
    totalSeats: number;
    soldCount: number;
    categories?: string[]; // @deprecated used for flat list
    categoryRows?: string[][]; // [NEW] Explicit row layout
}

export interface Profile {
    id: string;
    school_name: string;
    rep_name: string;
    rep_surnames: string;
    phone: string;
    email: string;
    is_approved?: boolean;
}

export interface RegistrationMessage {
    id: string;
    registration_id: string;
    sender_role: 'admin' | 'user';
    content: string;
    created_at: string;
    is_read?: boolean;
}
