create extension if not exists "pgcrypto";

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  percent_fee numeric(10, 4) not null default 0,
  fixed_fee numeric(10, 2) not null default 0,
  payout_days integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid references public.platforms(id) on delete set null,
  order_number text not null unique,
  customer_name text not null,
  gross_amount numeric(12, 2) not null default 0,
  fees_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'Pendente',
  ordered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  description text not null,
  due_date date not null,
  expected_amount numeric(12, 2) not null default 0,
  received_amount numeric(12, 2) not null default 0,
  status text not null default 'Pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  financial_entry_id uuid references public.financial_entries(id) on delete set null,
  expected_amount numeric(12, 2) not null default 0,
  received_amount numeric(12, 2) not null default 0,
  difference_amount numeric(12, 2) not null default 0,
  status text not null default 'Em conciliação',
  notes text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'uploaded-files',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  ocr_status text not null default 'pending',
  extracted_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'operador',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.platforms enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.financial_entries enable row level security;
alter table public.reconciliations enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.users_profiles enable row level security;

create policy "authenticated read platforms" on public.platforms for select to authenticated using (true);
create policy "authenticated write platforms" on public.platforms for all to authenticated using (true) with check (true);

create policy "authenticated read orders" on public.orders for select to authenticated using (true);
create policy "authenticated write orders" on public.orders for all to authenticated using (true) with check (true);

create policy "authenticated read order_items" on public.order_items for select to authenticated using (true);
create policy "authenticated write order_items" on public.order_items for all to authenticated using (true) with check (true);

create policy "authenticated read financial_entries" on public.financial_entries for select to authenticated using (true);
create policy "authenticated write financial_entries" on public.financial_entries for all to authenticated using (true) with check (true);

create policy "authenticated read reconciliations" on public.reconciliations for select to authenticated using (true);
create policy "authenticated write reconciliations" on public.reconciliations for all to authenticated using (true) with check (true);

create policy "authenticated read uploaded_files" on public.uploaded_files for select to authenticated using (true);
create policy "authenticated write uploaded_files" on public.uploaded_files for all to authenticated using (true) with check (true);

create policy "users can read profiles" on public.users_profiles for select to authenticated using (true);
create policy "authenticated insert profiles" on public.users_profiles for insert to authenticated with check (true);
create policy "authenticated update profiles" on public.users_profiles for update to authenticated using (true) with check (true);
create policy "authenticated delete profiles" on public.users_profiles for delete to authenticated using (true);
create policy "users can update own profile" on public.users_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users can delete own profile" on public.users_profiles for delete to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'operador'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
