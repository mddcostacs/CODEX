insert into storage.buckets (id, name, public)
values ('uploaded-files', 'uploaded-files', false)
on conflict (id) do nothing;

create policy "authenticated upload files"
on storage.objects for insert to authenticated
with check (bucket_id = 'uploaded-files');

create policy "authenticated read files"
on storage.objects for select to authenticated
using (bucket_id = 'uploaded-files');

create policy "authenticated delete files"
on storage.objects for delete to authenticated
using (bucket_id = 'uploaded-files');
