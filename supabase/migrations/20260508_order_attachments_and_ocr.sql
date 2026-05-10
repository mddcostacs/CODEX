alter table public.uploaded_files
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists category text,
  add column if not exists ocr_confidence numeric(10, 4),
  add column if not exists parsed_payload jsonb not null default '{}'::jsonb;

create index if not exists idx_uploaded_files_order_id on public.uploaded_files(order_id);
create index if not exists idx_uploaded_files_category on public.uploaded_files(category);

update public.uploaded_files
set ocr_status = 'pendente de leitura'
where ocr_status is null or ocr_status in ('pending', 'pendente', '');
