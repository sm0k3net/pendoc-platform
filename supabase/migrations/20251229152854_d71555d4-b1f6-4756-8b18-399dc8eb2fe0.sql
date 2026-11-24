-- Create an avatars bucket for profile photos (used by Settings page)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

-- Storage policies for avatars
-- Public read (matches bucket intent: public avatars)
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

-- Users can manage only their own avatar files under folder: {user_id}/...
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to public
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects
for update
to public
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to public
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);
