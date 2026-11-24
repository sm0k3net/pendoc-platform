-- Run against a disposable PenDoc database as the database owner.
begin;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
('f0000000-0000-4000-8000-000000000001', 'owner@example.test', now(), '{}'),
('f0000000-0000-4000-8000-000000000002', 'client@example.test', now(), '{}');

insert into public.clients (id, user_id, company_name) values
('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Demo client');
insert into public.projects (id, user_id, client_id, name) values
('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
 'f1000000-0000-4000-8000-000000000001', 'Demo engagement');
insert into public.client_access (id, owner_id, client_id, client_email, access_token, is_active) values
('f3000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
 'f1000000-0000-4000-8000-000000000001', 'client@example.test', 'synthetic-test-invitation', true);
insert into public.project_reports (project_id, created_by, name, html_content, client_visible) values
('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Draft', '<p>Draft</p>', false),
('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Published', '<p>Published</p>', true);
insert into public.vulnerabilities (id, project_id, user_id, title, severity) values
('f4000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001',
 'f0000000-0000-4000-8000-000000000001', 'Synthetic finding', 'low');

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","email":"client@example.test","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if not public.accept_client_invitation('synthetic-test-invitation') then raise exception 'Verified client could not accept invitation'; end if;
  if (select array_agg(name order by name) from public.project_reports) is distinct from array['Published'] then
    raise exception 'Client must see exactly the published report';
  end if;
  if public.request_client_retests(array['f4000000-0000-4000-8000-000000000001'::uuid]) <> 1 then
    raise exception 'Client could not request a retest';
  end if;
end $$;
reset role;
update public.client_access set expires_at = now() - interval '1 second'
where id = 'f3000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$
begin
  if exists (select from public.project_reports) then raise exception 'Expired assignment still allows report access'; end if;
end $$;
reset role;
rollback;
