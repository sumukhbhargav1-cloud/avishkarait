-- Admin, participant and meal workflows for the independent portal project.
create extension if not exists pgcrypto with schema extensions;

alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations add constraint registrations_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected', 'payment_pending', 'confirmed'));
alter table public.registrations drop constraint if exists registrations_payment_status_check;
alter table public.registrations add constraint registrations_payment_status_check
  check (payment_status in ('pending', 'verified', 'confirmed', 'rejected'));
alter table public.registrations
  add column if not exists confirmed_at timestamptz,
  add column if not exists temporary_password_ciphertext text,
  add column if not exists temporary_password_nonce text,
  add column if not exists temporary_password_tag text,
  add column if not exists confirmation_claimed_at timestamptz,
  add column if not exists password_changed_at timestamptz;

create table public.participant_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  participant_email text not null,
  participant_name text not null,
  token_hash text not null unique,
  token_ciphertext text not null,
  token_nonce text not null,
  token_tag text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (registration_id, participant_email)
);
create index participant_qr_registration_idx on public.participant_qr_tokens(registration_id);

create table public.meal_checkins (
  id uuid primary key default gen_random_uuid(),
  participant_token_id uuid not null references public.participant_qr_tokens(id) on delete restrict,
  checked_in_by uuid not null references auth.users(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  unique (participant_token_id)
);
create index meal_checkins_time_idx on public.meal_checkins(checked_in_at desc);

create table public.accommodation_requests (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  participant_user_id uuid not null references auth.users(id) on delete cascade,
  participant_name text not null,
  guest_count smallint not null check (guest_count between 1 and 10),
  check_in date,
  check_out date,
  requirements text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out is null or check_in is null or check_out > check_in)
);
create index accommodation_status_idx on public.accommodation_requests(status, created_at desc);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc);

create table public.meal_checkin_attempts (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  token_hash text,
  outcome text not null check (outcome in ('invalid', 'unconfirmed', 'duplicate', 'success')),
  created_at timestamptz not null default now()
);

alter table public.participant_qr_tokens enable row level security;
alter table public.meal_checkins enable row level security;
alter table public.accommodation_requests enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.meal_checkin_attempts enable row level security;

create policy "Admins read participant QR tokens" on public.participant_qr_tokens
  for select to authenticated using (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Participants read own accommodation requests" on public.accommodation_requests
  for select to authenticated using (participant_user_id = (select auth.uid()));
create policy "Participants create own accommodation requests" on public.accommodation_requests
  for insert to authenticated with check (
    participant_user_id = (select auth.uid()) and exists (
      select 1 from public.registrations r where r.id = registration_id and r.team_leader_id = (select auth.uid()) and r.status = 'confirmed'
    )
  );
create policy "Admins manage accommodation requests" on public.accommodation_requests
  for all to authenticated using (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Admins read meal history" on public.meal_checkins
  for select to authenticated using (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Admins read audit log" on public.admin_audit_log
  for select to authenticated using (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Security definer function keeps duplicate check-in prevention atomic.
create or replace function public.admin_meal_checkin(p_token_hash text, p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_participant public.participant_qr_tokens%rowtype; v_registration public.registrations%rowtype; v_checkin public.meal_checkins%rowtype;
begin
  if not exists(select 1 from public.profiles where id = p_admin_user_id and role = 'admin') then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;
  select * into v_participant from public.participant_qr_tokens where token_hash = p_token_hash and revoked_at is null;
  if not found then
    insert into public.meal_checkin_attempts(admin_user_id, token_hash, outcome) values(p_admin_user_id,p_token_hash,'invalid');
    return jsonb_build_object('outcome','invalid');
  end if;
  select * into v_registration from public.registrations where id = v_participant.registration_id;
  if v_registration.payment_status <> 'confirmed' or v_registration.status <> 'confirmed' then
    insert into public.meal_checkin_attempts(admin_user_id, token_hash, outcome) values(p_admin_user_id,p_token_hash,'unconfirmed');
    return jsonb_build_object('outcome','unconfirmed');
  end if;
  insert into public.meal_checkins(participant_token_id, checked_in_by)
    values(v_participant.id,p_admin_user_id) on conflict(participant_token_id) do nothing returning * into v_checkin;
  if not found then
    insert into public.meal_checkin_attempts(admin_user_id, token_hash, outcome) values(p_admin_user_id,p_token_hash,'duplicate');
    return jsonb_build_object('outcome','duplicate','participantName',v_participant.participant_name,'teamName',v_registration.team_name);
  end if;
  insert into public.meal_checkin_attempts(admin_user_id, token_hash, outcome) values(p_admin_user_id,p_token_hash,'success');
  return jsonb_build_object('outcome','success','participantName',v_participant.participant_name,'participantEmail',v_participant.participant_email,'teamName',v_registration.team_name,'checkedInAt',v_checkin.checked_in_at);
end;
$$;
revoke all on function public.admin_meal_checkin(text,uuid) from public, anon, authenticated;
grant execute on function public.admin_meal_checkin(text,uuid) to service_role;

create or replace function public.admin_mark_payment_rejected(p_registration_id uuid, p_admin_user_id uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.profiles where id = p_admin_user_id and role = 'admin') then raise exception using errcode = '42501'; end if;
  update public.registrations set payment_status='rejected', status='rejected', updated_at=now()
    where id=p_registration_id and payment_status <> 'confirmed';
  if not found then raise exception using errcode='P0002', message='Registration not found or payment already confirmed.'; end if;
  insert into public.admin_audit_log(admin_user_id,action,entity_type,entity_id,details)
    values(p_admin_user_id,'payment_rejected','registration',p_registration_id::text,jsonb_build_object('reason',left(p_reason,500)));
end;
$$;
revoke all on function public.admin_mark_payment_rejected(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_mark_payment_rejected(uuid,uuid,text) to service_role;

create or replace function public.admin_claim_registration_confirmation(p_registration_id uuid,p_admin_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if not exists(select 1 from public.profiles where id=p_admin_user_id and role='admin') then raise exception using errcode='42501'; end if;
  update public.registrations set confirmation_claimed_at=now()
    where id=p_registration_id and payment_status='pending'
      and (confirmation_claimed_at is null or confirmation_claimed_at < now()-interval '2 minutes');
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
revoke all on function public.admin_claim_registration_confirmation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_claim_registration_confirmation(uuid,uuid) to service_role;

create or replace function public.admin_release_registration_confirmation(p_registration_id uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.registrations set confirmation_claimed_at=null where id=p_registration_id and payment_status='pending';
$$;
revoke all on function public.admin_release_registration_confirmation(uuid) from public,anon,authenticated;
grant execute on function public.admin_release_registration_confirmation(uuid) to service_role;

create trigger accommodation_requests_updated_at before update on public.accommodation_requests
  for each row execute function public.set_updated_at();
