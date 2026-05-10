alter table public.uploaded_files
  add column if not exists ocr_confidence numeric(10, 4),
  add column if not exists ai_processed boolean not null default false,
  add column if not exists ai_raw_response jsonb not null default '{}'::jsonb,
  add column if not exists parsed_payload jsonb not null default '{}'::jsonb;

create index if not exists idx_uploaded_files_ai_processed on public.uploaded_files(ai_processed);
