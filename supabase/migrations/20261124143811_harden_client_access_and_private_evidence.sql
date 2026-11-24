-- All client authorization is evaluated against a current assignment.
begin;

drop policy if exists "Anyone can verify access token" on public.client_access;
drop policy if exists "Users can link their account to client access" on public.client_access;
drop policy if exists "Clients can view their own access" on public.client_access;
create policy "Clients can view their own access"
on public.client_access for select to authenticated
using (client_user_id = (select auth.uid()) and is_active
  and (expires_at is null or expires_at > now()));

-- Prevent permissive legacy policies from reviving expired assignments in joins.
create policy "Client assignments must be current for recipients"
on public.client_access as restrictive for select to authenticated
using (owner_id = (select auth.uid()) or (client_user_id = (select auth.uid())
  and is_active and (expires_at is null or expires_at > now())));

create or replace function public.is_client_for_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    join public.client_access ca on ca.owner_id = p.user_id and (
      ca.project_id = p.id or (ca.project_id is null and ca.client_id = p.client_id)
    )
    where p.id = p_project_id and ca.client_user_id = (select auth.uid())
      and ca.is_active and (ca.expires_at is null or ca.expires_at > now())
  )
$$;
revoke all on function public.is_client_for_project(uuid) from public, anon;
grant execute on function public.is_client_for_project(uuid) to authenticated;

-- Remove each historical client route to report drafts. Explicit collaborator
-- shares and auditor ownership are independent of client assignments.
drop policy if exists "Clients can view project_reports in their projects" on public.project_reports;
drop policy if exists "Clients can view project reports" on public.project_reports;
drop policy if exists "Clients can view reports for their projects" on public.project_reports;
drop policy if exists "Client users can view project reports in their organization" on public.project_reports;
drop policy if exists "Clients can view explicitly shared project reports" on public.project_reports;
create policy "Clients can view explicitly shared project reports"
on public.project_reports for select to authenticated
using (client_visible and public.is_client_for_project(project_id));

-- Revoke every deployed signature, because older projects can have overloads.
do $$
declare f record;
begin
  for f in
    select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('validate_client_token', 'link_client_to_access',
        'admin_confirm_client_email', 'update_client_last_login', 'cleanup_old_audit_logs')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
  end loop;
end $$;

create function public.accept_client_invitation(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  verified_email text;
begin
  if caller_id is null or p_token is null or length(p_token) > 512 then
    return false;
  end if;
  select lower(email) into verified_email from auth.users
    where id = caller_id and email_confirmed_at is not null;
  if verified_email is null then return false; end if;

  update public.client_access ca
  set client_user_id = caller_id, last_login_at = now(), access_token = null
  where ca.access_token = btrim(p_token) and ca.is_active
    and (ca.expires_at is null or ca.expires_at > now())
    and (ca.client_user_id is null or ca.client_user_id = caller_id)
    and lower(ca.client_email) = verified_email
    and (ca.project_id is not null or ca.client_id is not null)
    and (ca.project_id is null or exists (
      select 1 from public.projects p where p.id = ca.project_id and p.user_id = ca.owner_id
    ))
    and (ca.client_id is null or exists (
      select 1 from public.clients c where c.id = ca.client_id and c.user_id = ca.owner_id
    ));
  return found;
end $$;
alter table public.client_access alter column access_token drop not null;
revoke all on function public.accept_client_invitation(text) from public, anon;
grant execute on function public.accept_client_invitation(text) to authenticated;

-- Owners may invite people to their own projects and organizations.
drop policy if exists "Owners can manage client access" on public.client_access;
drop policy if exists "Project owners can manage client access" on public.client_access;
create policy "Owners can manage client access"
on public.client_access for all to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid()) and (project_id is not null or client_id is not null)
  and (project_id is null or exists (
    select 1 from public.projects p where p.id = client_access.project_id and p.user_id = (select auth.uid())
  ))
  and (client_id is null or exists (
    select 1 from public.clients c where c.id = client_access.client_id and c.user_id = (select auth.uid())
  ))
);

drop policy if exists "Clients can request retest" on public.vulnerabilities;
drop policy if exists "Client users can request retest" on public.vulnerabilities;
drop policy if exists "Clients can request retests on vulnerabilities" on public.vulnerabilities;
create function public.request_client_retests(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare result_count integer;
begin
  if auth.uid() is null or coalesce(cardinality(p_ids), 0) not between 1 and 100 then
    raise exception 'Select between 1 and 100 findings' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_ids) as requested(id)
    where not exists (
      select 1 from public.vulnerabilities v where v.id = requested.id
        and public.is_client_for_project(v.project_id)
    )
  ) then
    raise exception 'Finding not available' using errcode = '42501';
  end if;
  update public.vulnerabilities v
  set retest_status = 'waiting', retest_requested_by = auth.uid(), retest_requested_at = now()
  where v.id = any(p_ids) and public.is_client_for_project(v.project_id)
    and v.retest_status is distinct from 'waiting';
  get diagnostics result_count = row_count;
  return result_count;
end $$;
revoke all on function public.request_client_retests(uuid[]) from public, anon;
grant execute on function public.request_client_retests(uuid[]) to authenticated;

-- Object URLs are stable references in the database. The UI resolves them to
-- short-lived signed URLs for rendering, after Storage checks the caller.
update storage.buckets set public = false where id = 'note-images';
drop policy if exists "Anyone can view note images" on storage.objects;
drop policy if exists "Public access for note images" on storage.objects;
create policy "Read note images through visible notes"
on storage.objects for select to authenticated
using (bucket_id = 'note-images' and (
  (storage.foldername(name))[1] = (select auth.uid())::text
  or exists (
    select 1 from public.files f
    where f.user_id::text = (storage.foldername(storage.objects.name))[1]
    and position('/note-images/' || storage.objects.name || '"' in f.content) > 0
  )
));

create or replace function public.rollback_file_version(p_file_id uuid, p_version_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare prior_content text;
begin
  if auth.uid() is null then return false; end if;
  select fv.content into prior_content from public.file_versions fv
    where fv.id = p_version_id and fv.file_id = p_file_id;
  if not found then return false; end if;

  -- Ordinary file RLS authorizes the update and the existing version trigger
  -- records the restored content.
  update public.files set content = prior_content, updated_at = now()
    where id = p_file_id;
  return found;
end $$;
revoke all on function public.rollback_file_version(uuid, uuid) from public, anon;
grant execute on function public.rollback_file_version(uuid, uuid) to authenticated;

create schema if not exists pendoc_private;
revoke all on schema pendoc_private from public;
create function pendoc_private.share_has_owner(kind text, item uuid, actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case kind
    when 'project' then exists (select from public.projects where id = item and user_id = actor)
    when 'folder' then exists (select from public.folders f join public.projects p on p.id = f.project_id
      where f.id = item and (p.user_id = actor or f.user_id = actor))
    when 'file' then exists (select from public.files f join public.projects p on p.id = f.project_id
      where f.id = item and (p.user_id = actor or f.user_id = actor))
    else false end
$$;
revoke all on function pendoc_private.share_has_owner(text, uuid, uuid) from public, anon;
grant execute on function pendoc_private.share_has_owner(text, uuid, uuid) to authenticated;

create policy "Shares must belong to the granting account" on public.shares
as restrictive for all to authenticated
using (pendoc_private.share_has_owner(resource_type::text, resource_id, owner_id))
with check (pendoc_private.share_has_owner(resource_type::text, resource_id, owner_id));

create function pendoc_private.check_share_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not pendoc_private.share_has_owner(new.resource_type::text, new.resource_id, new.owner_id) then
    raise exception 'Share resource is not owned by the grantor' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function pendoc_private.check_share_owner() from public;
create trigger check_share_owner before insert or update of resource_type, resource_id, owner_id
on public.shares for each row execute function pendoc_private.check_share_owner();

-- Shared policies in older schemas also call this SECURITY DEFINER helper.
do $$
begin
  if to_regprocedure('public.has_share_access(uuid,public.share_resource_type,uuid,public.share_permission)') is not null then
    execute $function$
      create or replace function public.has_share_access(
        _user_id uuid, _resource_type public.share_resource_type, _resource_id uuid,
        _required_permission public.share_permission default 'read'
      ) returns boolean language sql stable security definer set search_path = '' as $body$
        select _user_id = (select auth.uid()) and exists (
          select from public.shares s where s.resource_type::text = _resource_type::text
            and s.resource_id = _resource_id and s.shared_with_user_id = _user_id
            and pendoc_private.share_has_owner(s.resource_type::text, s.resource_id, s.owner_id)
            and (_required_permission = 'read' or s.permission::text = 'read_write_add'
              or (s.permission::text = 'read_write' and _required_permission = 'read_write'))
        )
      $body$
    $function$;
  end if;
end $$;


create table pendoc_private.notification_deliveries (
  event text primary key,
  actor uuid not null,
  created_at timestamptz not null default now()
);
create index on pendoc_private.notification_deliveries (actor, created_at);

create function public.reserve_notification_delivery(p_actor uuid, p_event text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text, 0));
  if (select count(*) from pendoc_private.notification_deliveries
    where actor = p_actor and created_at > now() - interval '1 hour') >= 20 then
    return false;
  end if;
  insert into pendoc_private.notification_deliveries (event, actor)
    values (p_event, p_actor) on conflict do nothing;
  return found;
end $$;
revoke all on function public.reserve_notification_delivery(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_notification_delivery(uuid, text) to service_role;

create function public.release_notification_delivery(p_actor uuid, p_event text)
returns void language sql security definer set search_path = '' as $$
  delete from pendoc_private.notification_deliveries where actor = p_actor and event = p_event;
$$;
revoke all on function public.release_notification_delivery(uuid, text) from public, anon, authenticated;
grant execute on function public.release_notification_delivery(uuid, text) to service_role;

commit;
