alter table public.platforms
  add column if not exists type text,
  add column if not exists transaction_fee numeric(10, 4) not null default 0,
  add column if not exists logistics_fee numeric(10, 4) not null default 0,
  add column if not exists advance_fee numeric(10, 4) not null default 0,
  add column if not exists monthly_fee numeric(10, 2) not null default 0,
  add column if not exists delivery_type text,
  add column if not exists notes text;

alter table public.orders
  add column if not exists operation_stage text not null default 'Novo',
  add column if not exists products_description text,
  add column if not exists discount_amount numeric(12, 2) not null default 0,
  add column if not exists other_deductions numeric(12, 2) not null default 0,
  add column if not exists installments integer not null default 1,
  add column if not exists delivery_method text,
  add column if not exists deadline_days integer not null default 3,
  add column if not exists notes text;

update public.orders
set operation_stage = case
  when status in ('Separando') then 'Separando'
  when status in ('Pronto', 'Finalizado', 'Recebido') then 'Pronto'
  else 'Novo'
end
where operation_stage is null or operation_stage = '';
