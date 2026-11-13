-- Fix ambiguity between the table column and RETURNS TABLE output variable.
-- The application can retry registration after this migration is applied.

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
