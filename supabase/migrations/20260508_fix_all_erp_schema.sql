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

alter table public.platforms
  add column if not exists type text,
  add column if not exists transaction_fee numeric(10, 4) not null default 0,
  add column if not exists logistics_fee numeric(10, 4) not null default 0,
  add column if not exists advance_fee numeric(10, 4) not null default 0,
  add column if not exists monthly_fee numeric(10, 2) not null default 0,
  add column if not exists delivery_type text,
  add column if not exists notes text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid references public.platforms(id) on delete set null,
  order_number text not null,
  customer_name text not null,
  gross_amount numeric(12, 2) not null default 0,
  fees_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'Novo',
  ordered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists platform_id uuid references public.platforms(id) on delete set null,
  add column if not exists order_number text,
  add column if not exists customer_name text,
  add column if not exists gross_amount numeric(12, 2) not null default 0,
  add column if not exists fees_amount numeric(12, 2) not null default 0,
  add column if not exists net_amount numeric(12, 2) not null default 0,
  add column if not exists status text not null default 'Novo',
  add column if not exists operation_stage text not null default 'Novo',
  add column if not exists products_description text,
  add column if not exists discount_amount numeric(12, 2) not null default 0,
  add column if not exists other_deductions numeric(12, 2) not null default 0,
  add column if not exists installments integer not null default 1,
  add column if not exists delivery_method text,
  add column if not exists deadline_days integer not null default 3,
  add column if not exists notes text,
  add column if not exists ordered_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

update public.orders
set
  status = coalesce(nullif(status, ''), 'Novo'),
  operation_stage = coalesce(nullif(operation_stage, ''), case
    when status = 'Separando' then 'Separando'
    when status in ('Pronto', 'Finalizado', 'Recebido') then 'Pronto'
    else 'Novo'
  end),
  installments = coalesce(installments, 1),
  deadline_days = coalesce(deadline_days, 3),
  discount_amount = coalesce(discount_amount, 0),
  other_deductions = coalesce(other_deductions, 0);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists name text,
  add column if not exists quantity integer not null default 1,
  add column if not exists unit_price numeric(12, 2) not null default 0,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  description text not null,
  due_date date not null default current_date,
  expected_amount numeric(12, 2) not null default 0,
  received_amount numeric(12, 2) not null default 0,
  status text not null default 'Pendente',
  created_at timestamptz not null default now()
);

alter table public.financial_entries
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists platform_id uuid references public.platforms(id) on delete set null,
  add column if not exists description text,
  add column if not exists due_date date not null default current_date,
  add column if not exists expected_amount numeric(12, 2) not null default 0,
  add column if not exists received_amount numeric(12, 2) not null default 0,
  add column if not exists status text not null default 'Pendente',
  add column if not exists created_at timestamptz not null default now();

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

alter table public.reconciliations
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists financial_entry_id uuid references public.financial_entries(id) on delete set null,
  add column if not exists expected_amount numeric(12, 2) not null default 0,
  add column if not exists received_amount numeric(12, 2) not null default 0,
  add column if not exists difference_amount numeric(12, 2) not null default 0,
  add column if not exists status text not null default 'Em conciliação',
  add column if not exists notes text,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  storage_bucket text not null default 'uploaded-files',
  storage_path text not null,
  file_name text not null,
  category text,
  mime_type text,
  file_size bigint,
  ocr_status text not null default 'pendente de leitura',
  ocr_confidence numeric(10, 4),
  parsed_payload jsonb not null default '{}'::jsonb,
  extracted_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.uploaded_files
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists storage_bucket text not null default 'uploaded-files',
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists category text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists ocr_status text not null default 'pendente de leitura',
  add column if not exists ocr_confidence numeric(10, 4),
  add column if not exists parsed_payload jsonb not null default '{}'::jsonb,
  add column if not exists extracted_text text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

update public.uploaded_files
set ocr_status = 'pendente de leitura'
where ocr_status is null or ocr_status in ('pending', 'pendente', '');

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'operador',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.users_profiles
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists role text not null default 'operador',
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_orders_ordered_at on public.orders(ordered_at desc);
create index if not exists idx_orders_platform_id on public.orders(platform_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_operation_stage on public.orders(operation_stage);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_financial_entries_due_date on public.financial_entries(due_date);
create index if not exists idx_reconciliations_updated_at on public.reconciliations(updated_at desc);
create index if not exists idx_uploaded_files_created_at on public.uploaded_files(created_at desc);
create index if not exists idx_uploaded_files_order_id on public.uploaded_files(order_id);
create index if not exists idx_uploaded_files_category on public.uploaded_files(category);
create index if not exists idx_users_profiles_email on public.users_profiles(email);

alter table public.platforms enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.financial_entries enable row level security;
alter table public.reconciliations enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.users_profiles enable row level security;

drop policy if exists "authenticated read platforms" on public.platforms;
drop policy if exists "authenticated write platforms" on public.platforms;
create policy "authenticated read platforms" on public.platforms for select to authenticated using (true);
create policy "authenticated write platforms" on public.platforms for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read orders" on public.orders;
drop policy if exists "authenticated write orders" on public.orders;
create policy "authenticated read orders" on public.orders for select to authenticated using (true);
create policy "authenticated write orders" on public.orders for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read order_items" on public.order_items;
drop policy if exists "authenticated write order_items" on public.order_items;
create policy "authenticated read order_items" on public.order_items for select to authenticated using (true);
create policy "authenticated write order_items" on public.order_items for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read financial_entries" on public.financial_entries;
drop policy if exists "authenticated write financial_entries" on public.financial_entries;
create policy "authenticated read financial_entries" on public.financial_entries for select to authenticated using (true);
create policy "authenticated write financial_entries" on public.financial_entries for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read reconciliations" on public.reconciliations;
drop policy if exists "authenticated write reconciliations" on public.reconciliations;
create policy "authenticated read reconciliations" on public.reconciliations for select to authenticated using (true);
create policy "authenticated write reconciliations" on public.reconciliations for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read uploaded_files" on public.uploaded_files;
drop policy if exists "authenticated write uploaded_files" on public.uploaded_files;
create policy "authenticated read uploaded_files" on public.uploaded_files for select to authenticated using (true);
create policy "authenticated write uploaded_files" on public.uploaded_files for all to authenticated using (true) with check (true);

drop policy if exists "users can read profiles" on public.users_profiles;
drop policy if exists "authenticated insert profiles" on public.users_profiles;
drop policy if exists "authenticated update profiles" on public.users_profiles;
drop policy if exists "authenticated delete profiles" on public.users_profiles;
drop policy if exists "users can update own profile" on public.users_profiles;
drop policy if exists "users can delete own profile" on public.users_profiles;
create policy "users can read profiles" on public.users_profiles for select to authenticated using (true);
create policy "authenticated insert profiles" on public.users_profiles for insert to authenticated with check (true);
create policy "authenticated update profiles" on public.users_profiles for update to authenticated using (true) with check (true);
create policy "authenticated delete profiles" on public.users_profiles for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('uploaded-files', 'uploaded-files', false)
on conflict (id) do nothing;

drop policy if exists "authenticated upload files" on storage.objects;
drop policy if exists "authenticated read files" on storage.objects;
drop policy if exists "authenticated delete files" on storage.objects;
create policy "authenticated upload files"
on storage.objects for insert to authenticated
with check (bucket_id = 'uploaded-files');
create policy "authenticated read files"
on storage.objects for select to authenticated
using (bucket_id = 'uploaded-files');
create policy "authenticated delete files"
on storage.objects for delete to authenticated
using (bucket_id = 'uploaded-files');

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
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.users_profiles.name, excluded.name),
    role = coalesce(public.users_profiles.role, excluded.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
