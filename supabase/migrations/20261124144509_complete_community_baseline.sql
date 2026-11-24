-- Fill differences between the original migrations and the community runtime.
alter table public.api_tokens
  alter column token drop not null,
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists is_active boolean not null default true;
create unique index if not exists api_tokens_token_hash_key
  on public.api_tokens (token_hash) where token_hash is not null;

alter table public.client_contacts add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists full_name text,
  add column if not exists organization_id uuid,
  add column if not exists organization_name text;
alter table public.project_reports alter column user_id drop not null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.vulnerabilities add column if not exists affected_assets text[],
  add column if not exists attachments jsonb,
  add column if not exists custom_fields jsonb,
  add column if not exists cve_ids text[],
  add column if not exists cvss_vector text,
  add column if not exists cwe_id text,
  add column if not exists folder_id uuid references public.folders(id) on delete set null,
  add column if not exists proof_of_concept text,
  add column if not exists reference_urls text[];

-- Supabase Data API grants vary between hosted and standalone deployments.
-- Only application tables already protected by RLS are exposed to authenticated users.
do $$
declare item record;
begin
  for item in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', item.relname);
    execute format('revoke all on public.%I from anon', item.relname);
  end loop;
end $$;
grant select on public.client_stats to authenticated, service_role;

insert into storage.buckets (id, name, public) values ('files', 'files', false)
on conflict (id) do nothing;
create policy "Upload project attachments in own namespace"
on storage.objects for insert to authenticated
with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Read own and visible project attachments"
on storage.objects for select to authenticated
using (bucket_id = 'files' and (
  (storage.foldername(name))[1] = (select auth.uid())::text
  or exists (
    select 1 from public.files f where f.storage_path = storage.objects.name
      and f.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
));

create policy "Delete project attachments in own namespace"
on storage.objects for delete to authenticated
using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
