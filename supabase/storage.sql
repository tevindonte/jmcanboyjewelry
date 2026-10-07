-- Run after 001_initial.sql
-- Private bucket for mold photos (no public access)

insert into storage.buckets (id, name, public)
values ('mold-photos', 'mold-photos', false)
on conflict (id) do nothing;

-- Deny public storage access; only service role uploads/reads via signed URLs
create policy "mold_photos_storage_no_public"
  on storage.objects for all
  using (bucket_id = 'mold-photos' and false);
