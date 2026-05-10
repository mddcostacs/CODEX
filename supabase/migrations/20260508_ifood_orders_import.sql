alter table public.orders
  add column if not exists external_order_id text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists imported_from text,
  add column if not exists imported_at timestamptz;

create unique index if not exists idx_orders_external_import_source
  on public.orders(imported_from, external_order_id)
  where external_order_id is not null;

create index if not exists idx_orders_imported_from on public.orders(imported_from);
create index if not exists idx_orders_imported_at on public.orders(imported_at desc);

drop policy if exists "authenticated read orders" on public.orders;
drop policy if exists "authenticated write orders" on public.orders;
create policy "authenticated read orders" on public.orders for select to authenticated using (true);
create policy "authenticated write orders" on public.orders for all to authenticated using (true) with check (true);
