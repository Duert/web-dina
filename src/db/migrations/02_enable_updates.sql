-- MIGRATION: 02_enable_updates.sql

-- 1. Enable UPDATE on ORDERS
-- Required for: confirmOrderPayment, cancelOrder, cleanupExpiredOrders
create policy "Enable update for all" on orders for update using (true);

-- 2. Enable DELETE on ORDERS (Optional, if we ever want to delete hard)
-- create policy "Enable delete for all" on orders for delete using (true);

-- 3. Ensure UPDATE on TICKETS is correct (re-applying to be safe)
drop policy if exists "Anon update tickets" on tickets;
create policy "Enable update for all tickets" on tickets for update using (true);
