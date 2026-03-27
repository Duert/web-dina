create table if not exists rankings_status (
  id uuid default gen_random_uuid() primary key,
  block text not null,
  category text not null,
  is_published boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(block, category)
);

alter table app_settings add column if not exists public_rankings_visible boolean default false;

alter table rankings_status enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rankings_status' and policyname = 'Public read access to rankings_status') then
    create policy "Public read access to rankings_status" on rankings_status for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rankings_status' and policyname = 'Admin full access to rankings_status') then
    create policy "Admin full access to rankings_status" on rankings_status for all using (true);
  end if;
end
$$;
