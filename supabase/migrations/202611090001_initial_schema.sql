-- AVISHKAR 2K26 Stage 2: auth-backed team registration.
-- Apply to a fresh Supabase project with `supabase db push` or the SQL editor.
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('participant', 'team_leader', 'admin', 'judge');
create type public.registration_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  github_username text,
  role public.app_role not null default 'participant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_nonempty check (length(trim(email)) > 3)
);
create unique index profiles_email_lower_unique on public.profiles (lower(email));

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text not null default '',
  problem_statement text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.registration_reference_seq start 1 increment 1;

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique default ('AV26-' || lpad(nextval('public.registration_reference_seq')::text, 6, '0')),
  leader_id uuid not null unique references public.profiles(id) on delete restrict,
  team_name text not null,
  institution text not null,
  domain_id uuid not null references public.domains(id) on delete restrict,
  repository_url text,
  status public.registration_status not null default 'pending',
  rules_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_team_name_nonempty check (length(trim(team_name)) between 2 and 100),
  constraint registrations_institution_nonempty check (length(trim(institution)) between 2 and 180)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  name text not null,
  institution text not null,
  domain_id uuid not null references public.domains(id) on delete restrict,
  leader_id uuid not null unique references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  github_username text,
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  constraint team_members_email_nonempty check (length(trim(email)) > 3),
  constraint team_members_name_nonempty check (length(trim(full_name)) between 2 and 120)
);
create unique index team_members_email_lower_unique on public.team_members (lower(email));
create unique index team_members_one_leader_per_team on public.team_members (team_id) where is_leader;
create index registrations_domain_idx on public.registrations(domain_id);
create index registrations_status_idx on public.registrations(status);
create index team_members_team_idx on public.team_members(team_id);

create table public.registration_settings (
  singleton boolean primary key default true check (singleton),
  minimum_team_size integer not null default 1 check (minimum_team_size >= 1),
  maximum_team_size integer check (maximum_team_size is null or maximum_team_size >= minimum_team_size),
  updated_at timestamptz not null default now()
);
insert into public.registration_settings(singleton, minimum_team_size, maximum_team_size)
values (true, 1, null);

insert into public.domains (slug, name, description) values
  ('ai-cybersecurity-fintech', 'AI, Cybersecurity & FinTech', 'Artificial intelligence, cybersecurity and financial technology.'),
  ('full-stack', 'Full Stack Development', 'Web product and application development.'),
  ('iot-embedded', 'IoT & Embedded Systems', 'Connected devices, sensing and embedded engineering.'),
  ('sustainable', 'Sustainable Development', 'Technology and engineering for sustainable outcomes.'),
  ('mechspark', 'MECHSPARK 2K26 — Mechanical Engineering', 'Mechanical engineering and applied design.')
on conflict (slug) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger domains_touch_updated_at before update on public.domains for each row execute function public.touch_updated_at();
create trigger registrations_touch_updated_at before update on public.registrations for each row execute function public.touch_updated_at();
create trigger teams_touch_updated_at before update on public.teams for each row execute function public.touch_updated_at();
create trigger registration_settings_touch_updated_at before update on public.registration_settings for each row execute function public.touch_updated_at();

-- A profile is created on Supabase email/OTP sign-up; a user cannot choose a privileged role.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email)
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = required_role) $$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists(select 1 from public.teams t where t.id = target_team_id and t.leader_id = auth.uid())
      or exists(select 1 from public.team_members m where m.team_id = target_team_id and m.profile_id = auth.uid())
$$;

revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
revoke all on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- One transaction creates the registration, team and members. Any validation or
-- uniqueness failure rolls back all rows and the caller receives no reference ID.
create or replace function public.submit_team_registration(
  p_team_name text,
  p_institution text,
  p_domain_id uuid,
  p_leader_name text,
  p_leader_email text,
  p_leader_phone text,
  p_leader_github text,
  p_members jsonb,
  p_repository_url text,
  p_rules_accepted boolean
)
returns table(registration_id uuid, registration_reference text, registration_status text, team_id uuid)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_email text;
  v_count integer;
  v_minimum integer;
  v_maximum integer;
  v_member jsonb;
  v_registration_id uuid;
  v_team_id uuid;
  v_reference text;
begin
  if v_user_id is null then raise exception using errcode = '28000', message = 'Sign in with email before registering.'; end if;
  if not coalesce(p_rules_accepted, false) then raise exception using errcode = '22023', message = 'Accept the event rules to continue.'; end if;
  if length(trim(coalesce(p_team_name, ''))) not between 2 and 100 then raise exception using errcode = '22023', message = 'Enter a valid team name.'; end if;
  if length(trim(coalesce(p_institution, ''))) not between 2 and 180 then raise exception using errcode = '22023', message = 'Enter a valid institution.'; end if;
  if length(trim(coalesce(p_leader_name, ''))) not between 2 and 120 then raise exception using errcode = '22023', message = 'Enter a valid team leader name.'; end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array' then raise exception using errcode = '22023', message = 'Team member details are required.'; end if;

  select lower(email) into v_auth_email from auth.users where id = v_user_id;
  if v_auth_email is null or lower(trim(coalesce(p_leader_email, ''))) <> v_auth_email then
    raise exception using errcode = '28000', message = 'The team leader email must match the signed-in email.';
  end if;
  if not exists(select 1 from public.domains where id = p_domain_id and is_active) then
    raise exception using errcode = '22023', message = 'Choose an active event domain.';
  end if;
  if p_repository_url is not null and p_repository_url !~* '^https://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$' then
    raise exception using errcode = '22023', message = 'Enter a valid GitHub repository URL.';
  end if;

  select minimum_team_size, maximum_team_size into v_minimum, v_maximum
  from public.registration_settings where singleton = true;
  v_count := jsonb_array_length(p_members) + 1;
  if v_count < coalesce(v_minimum, 1) then raise exception using errcode = '22023', message = 'Team does not meet the configured minimum size.'; end if;
  if v_maximum is not null and v_count > v_maximum then raise exception using errcode = '22023', message = 'Team exceeds the configured maximum size.'; end if;

  if exists (
    select 1 from (
      select lower(trim(p_leader_email)) as email
      union all
      select lower(trim(value ->> 'email')) from jsonb_array_elements(p_members)
    ) e group by e.email having e.email = '' or count(*) > 1
  ) then raise exception using errcode = '22023', message = 'Team member email addresses must be present and unique.'; end if;
  for v_member in select value from jsonb_array_elements(p_members) loop
    if length(trim(coalesce(v_member ->> 'full_name', ''))) not between 2 and 120
       or coalesce(v_member ->> 'email', '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = '22023', message = 'Check each team member name and email.';
    end if;
    if nullif(trim(v_member ->> 'github_username'), '') is not null
       and trim(v_member ->> 'github_username') !~ '^[A-Za-z0-9-]{1,39}$' then
      raise exception using errcode = '22023', message = 'Enter a valid GitHub username.';
    end if;
  end loop;

  update public.profiles set full_name = trim(p_leader_name), phone = nullif(trim(p_leader_phone), ''),
    github_username = nullif(trim(p_leader_github), ''), role = 'team_leader'
  where id = v_user_id;

  insert into public.registrations(leader_id, team_name, institution, domain_id, repository_url, rules_accepted_at)
  values (v_user_id, trim(p_team_name), trim(p_institution), p_domain_id, nullif(trim(p_repository_url), ''), now())
  returning id, reference_id into v_registration_id, v_reference;

  insert into public.teams(registration_id, name, institution, domain_id, leader_id)
  values (v_registration_id, trim(p_team_name), trim(p_institution), p_domain_id, v_user_id)
  returning id into v_team_id;

  insert into public.team_members(team_id, profile_id, full_name, email, github_username, is_leader)
  values (v_team_id, v_user_id, trim(p_leader_name), lower(trim(p_leader_email)), nullif(trim(p_leader_github), ''), true);
  for v_member in select value from jsonb_array_elements(p_members) loop
    insert into public.team_members(team_id, full_name, email, github_username, is_leader)
    values (v_team_id, trim(v_member ->> 'full_name'), lower(trim(v_member ->> 'email')),
      nullif(trim(v_member ->> 'github_username'), ''), false);
  end loop;

  return query select v_registration_id, v_reference, 'pending'::text, v_team_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'This account or a team member email is already registered.';
end;
$$;

alter table public.profiles enable row level security;
alter table public.domains enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.registration_settings enable row level security;

create policy "profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('admin'));
create policy "profiles update own fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, phone, github_username) on public.profiles to authenticated;
create policy "public reads active domains" on public.domains for select using (is_active);
create policy "admin manages domains" on public.domains for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "leader reads own registration" on public.registrations for select to authenticated using (leader_id = auth.uid() or public.has_role('admin'));
create policy "admin manages registrations" on public.registrations for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "team member reads own team" on public.teams for select to authenticated using (public.is_team_member(id) or public.has_role('admin'));
create policy "admin manages teams" on public.teams for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "team members read own team" on public.team_members for select to authenticated using (public.is_team_member(team_id) or public.has_role('admin'));
create policy "admin manages team members" on public.team_members for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "registration settings read" on public.registration_settings for select using (true);
create policy "admin manages registration settings" on public.registration_settings for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

revoke all on function public.submit_team_registration(text, text, uuid, text, text, text, text, jsonb, text, boolean) from public, anon;
grant execute on function public.submit_team_registration(text, text, uuid, text, text, text, text, jsonb, text, boolean) to authenticated;
grant select on public.domains, public.registration_settings to anon, authenticated;
grant select on public.profiles, public.registrations, public.teams, public.team_members to authenticated;
grant insert, update, delete on public.domains, public.registration_settings, public.registrations, public.teams, public.team_members to authenticated;
