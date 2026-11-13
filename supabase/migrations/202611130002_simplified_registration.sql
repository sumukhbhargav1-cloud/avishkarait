-- Simplified public registration and private payment proof storage.
-- This migration belongs only to the new portal Supabase project.

alter table public.registrations
  alter column event_id drop not null,
  alter column team_leader_id drop not null,
  add column if not exists domain_slug text,
  add column if not exists domain_name text,
  add column if not exists challenge_id text,
  add column if not exists team_size smallint,
  add column if not exists team_leader_name text,
  add column if not exists team_leader_email text,
  add column if not exists team_leader_phone text,
  add column if not exists utr_reference text,
  add column if not exists payment_proof_path text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists registration_reference text not null default ('AV26-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations add constraint registrations_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected', 'payment_pending'));
alter table public.registrations drop constraint if exists registrations_payment_status_check;
alter table public.registrations add constraint registrations_payment_status_check
  check (payment_status in ('pending', 'verified', 'rejected'));
alter table public.registrations drop constraint if exists registrations_team_size_check;
alter table public.registrations add constraint registrations_team_size_check
  check (team_size is null or team_size between 1 and 10);
alter table public.registrations drop constraint if exists registrations_utr_check;
alter table public.registrations add constraint registrations_utr_check
  check (utr_reference is null or utr_reference ~ '^[A-Za-z0-9]{6,40}$');

create unique index if not exists registrations_reference_unique on public.registrations(registration_reference);
create unique index if not exists registrations_domain_leader_email_unique
  on public.registrations(domain_slug, lower(team_leader_email))
  where domain_slug is not null and team_leader_email is not null;
create unique index if not exists registrations_domain_team_name_unique
  on public.registrations(domain_slug, lower(trim(team_name)))
  where domain_slug is not null;
create unique index if not exists registrations_payment_utr_unique
  on public.registrations(lower(utr_reference))
  where utr_reference is not null;
create index if not exists registrations_domain_slug_idx on public.registrations(domain_slug);

alter table public.registration_members
  add column if not exists phone text,
  add column if not exists domain_slug text;
create unique index if not exists registration_members_domain_email_unique
  on public.registration_members(domain_slug, lower(email))
  where domain_slug is not null;

-- Public registration is served only by the server route using the service role.
revoke all on public.registrations, public.registration_members from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- No anon/authenticated storage policies are created. Only the server-side
-- service key can write/read proofs; the bucket remains private.

create or replace function public.registration_domain_counts()
returns table(domain_slug text, registered_teams bigint)
language sql stable security definer set search_path = '' as $$
  select r.domain_slug, count(*)
  from public.registrations r
  where r.domain_slug is not null
  group by r.domain_slug;
$$;
revoke all on function public.registration_domain_counts() from public, anon, authenticated;
grant execute on function public.registration_domain_counts() to service_role;

create or replace function public.submit_registration(
  p_registration_id uuid,
  p_domain_slug text,
  p_domain_name text,
  p_challenge_id text,
  p_capacity integer,
  p_minimum_team_size integer,
  p_maximum_team_size integer,
  p_team_name text,
  p_team_size integer,
  p_leader_name text,
  p_leader_email text,
  p_leader_phone text,
  p_members jsonb,
  p_utr_reference text,
  p_payment_proof_path text
)
returns table(registration_id uuid, registration_reference text, registered_teams bigint, remaining_slots integer)
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_registered bigint;
  v_reference text;
  v_all_emails text[];
  v_person jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Server registration access required.';
  end if;
  if p_capacity is null or p_capacity < 1 then
    raise exception using errcode = '22023', message = 'Registration capacity is not configured.';
  end if;
  if p_minimum_team_size is null or p_maximum_team_size is null
    or p_minimum_team_size < 1 or p_maximum_team_size < p_minimum_team_size
    or p_team_size < p_minimum_team_size or p_team_size > p_maximum_team_size then
    raise exception using errcode = '22023', message = 'Team size does not match the selected challenge rules.';
  end if;
  if length(trim(coalesce(p_team_name, ''))) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Enter a valid team name.';
  end if;
  if length(trim(coalesce(p_leader_name, ''))) not between 2 and 120
    or length(trim(coalesce(p_leader_email, ''))) > 254
    or trim(coalesce(p_leader_email, '')) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or trim(coalesce(p_leader_phone, '')) !~ '^\+?[0-9(). -]{7,20}$' then
    raise exception using errcode = '22023', message = 'Check the team leader details.';
  end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array'
    or jsonb_array_length(p_members) <> p_team_size - 1 then
    raise exception using errcode = '22023', message = 'Team member details do not match the selected team size.';
  end if;
  if length(trim(coalesce(p_utr_reference, ''))) not between 6 and 40
    or trim(p_utr_reference) !~ '^[A-Za-z0-9]+$'
    or p_payment_proof_path is null
    or p_payment_proof_path not like p_registration_id::text || '/%' then
    raise exception using errcode = '22023', message = 'Payment details are incomplete.';
  end if;

  v_all_emails := array[lower(trim(p_leader_email))];
  for v_person in select value from jsonb_array_elements(p_members) loop
    if length(trim(coalesce(v_person->>'fullName', ''))) not between 2 and 120
      or trim(coalesce(v_person->>'email', '')) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or trim(coalesce(v_person->>'phone', '')) !~ '^\+?[0-9(). -]{7,20}$' then
      raise exception using errcode = '22023', message = 'Check each team member name, email and phone.';
    end if;
    v_all_emails := array_append(v_all_emails, lower(trim(v_person->>'email')));
  end loop;
  if cardinality(v_all_emails) <> (select count(distinct value) from unnest(v_all_emails) as emails(value)) then
    raise exception using errcode = '22023', message = 'Each team member must use a different email address.';
  end if;

  -- One lock per configured domain serializes the capacity and duplicate checks.
  perform pg_advisory_xact_lock(hashtextextended('avishkar-registration:' || p_domain_slug, 0));

  select count(*) into v_registered from public.registrations r where r.domain_slug = p_domain_slug;
  if v_registered >= p_capacity then
    raise exception using errcode = 'P0001', message = 'This domain has reached its registration capacity.';
  end if;

  if exists (
    select 1 from public.registrations r
    where r.domain_slug = p_domain_slug and lower(r.team_leader_email) = any(v_all_emails)
    union all
    select 1 from public.registration_members m
    where m.domain_slug = p_domain_slug and lower(m.email) = any(v_all_emails)
  ) then
    raise exception using errcode = '23505', message = 'One or more team members are already registered in this domain.';
  end if;

  insert into public.registrations as inserted_registration (
    id, event_id, team_leader_id, domain_slug, domain_name, challenge_id,
    team_name, team_size, team_leader_name, team_leader_email, team_leader_phone,
    status, payment_status, utr_reference, payment_proof_path, submitted_at
  ) values (
    p_registration_id, null, null, p_domain_slug, p_domain_name, p_challenge_id,
    trim(p_team_name), p_team_size, trim(p_leader_name), lower(trim(p_leader_email)), trim(p_leader_phone),
    'payment_pending', 'pending', upper(trim(p_utr_reference)), p_payment_proof_path, now()
  ) returning inserted_registration.registration_reference into v_reference;

  for v_person in select value from jsonb_array_elements(p_members) loop
    insert into public.registration_members (registration_id, full_name, email, phone, domain_slug)
    values (p_registration_id, trim(v_person->>'fullName'), lower(trim(v_person->>'email')), trim(v_person->>'phone'), p_domain_slug);
  end loop;

  return query select p_registration_id, v_reference, v_registered + 1, p_capacity - (v_registered::integer + 1);
end;
$$;
revoke all on function public.submit_registration(uuid,text,text,text,integer,integer,integer,text,integer,text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.submit_registration(uuid,text,text,text,integer,integer,integer,text,integer,text,text,text,jsonb,text,text) to service_role;
