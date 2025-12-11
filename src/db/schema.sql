-- DINA 26 Database Schema

-- 1. SESSIONS
create table sessions (
  id text primary key, -- 'morning', 'afternoon'
  name text not null,
  date timestamp with time zone not null,
  total_seats integer default 961,
  created_at timestamp with time zone default now()
);

-- 2. SEATS
-- Stores the static layout of the theater.
-- We can share this table if layout is identical for all sessions, OR
-- we can have a 'session_id' foreign key if layout differs (which it doesn't here physically, but status does).
-- BETTER APPROACH: 'Seats' table defines the physical room. 'Tickets' or 'SeatStatus' tracks availability per session.
create table seats (
  id text primary key, -- e.g., 'R1-5'
  row_number integer not null,
  number integer not null,
  zone text not null, -- 'Preferente', 'Zona 2', etc.
  type text not null default 'standard', -- 'standard', 'pmr'
  created_at timestamp with time zone default now()
);

-- 3. TICKETS / SEAT AVAILABILITY
-- Tracks the status of a seat for a specific session.
create table tickets (
  id uuid primary key default gen_random_uuid(),
  session_id text references sessions(id) not null,
  seat_id text references seats(id) not null,
  status text not null default 'available', -- 'available', 'held', 'sold', 'blocked'
  holder_name text, -- Optional: name of the person who bought it
  price numeric(10, 2) not null default 0,
  sold_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  unique(session_id, seat_id) -- One status per seat per session
);

-- RLS POLICIES (Simple for now)
alter table sessions enable row level security;
alter table seats enable row level security;
alter table tickets enable row level security;

create policy "Public read access to sessions" on sessions for select using (true);
create policy "Public read access to seats" on seats for select using (true);
create policy "Public read access to tickets" on tickets for select using (true);

-- Allow anon to update tickets for now (dangerous in prod, acceptable for MVP dev)
create policy "Anon update tickets" on tickets for update using (true);
create policy "Anon insert tickets" on tickets for insert with check (true);

-- SEED DATA (Sessions)
insert into sessions (id, name, date) values 
('morning', 'Sesión Mañana', '2026-06-20 12:00:00+00'),
('afternoon', 'Sesión Tarde', '2026-06-20 18:00:00+00')
on conflict (id) do nothing;
