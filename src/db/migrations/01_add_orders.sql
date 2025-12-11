-- MIGRATION: 01_add_orders.sql

-- 1. Create ORDERS table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  total_amount numeric(10, 2) not null,
  payment_status text not null default 'pending', -- 'pending', 'paid', 'failed'
  payment_provider text not null default 'manual', -- 'stripe', 'redsys', 'manual'
  created_at timestamp with time zone default now()
);

-- 2. Link TICKETS to ORDERS
alter table tickets 
add column if not exists order_id uuid references orders(id);

-- 3. Security Policies (Open for MVP)
alter table orders enable row level security;

-- Allow anyone to create an order
create policy "Enable insert for all" on orders for insert with check (true);

-- Allow reading orders (useful for confirmation page)
create policy "Enable select for all" on orders for select using (true);

-- (Optional) If you have issues with RLS blocking updates similar to before, 
-- you can run: alter table orders disable row level security;
