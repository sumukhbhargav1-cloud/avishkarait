-- Initial schema for the independent AVISHKAR portal Supabase project.
-- Apply only to the NEW Supabase project created for portal.avishkarait.online.

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'participant' check (role in ('participant', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portal_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Event details, rules, domains and team limits belong to this portal DB.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  registration_open boolean not null default false,
  min_team_size smallint not null default 1 check (min_team_size > 0),
  max_team_size smallint not null default 4 check (max_team_size >= min_team_size),
  rules jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  team_name text not null,
  team_leader_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_name)
);

create table public.registration_members (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  full_name text not null,
  email text not null,
  institution text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  unique (registration_id, email)
);

create index registrations_leader_idx on public.registrations(team_leader_id);
create index registration_members_registration_idx on public.registration_members(registration_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.portal_config enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_members enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = 'participant');

create policy "Public reads portal config" on public.portal_config
  for select to anon, authenticated using (key in ('branding', 'contact', 'registration'));
create policy "Public reads events" on public.events
  for select to anon, authenticated using (true);

create policy "Leader reads registration" on public.registrations
  for select to authenticated using (team_leader_id = (select auth.uid()));
create policy "Leader creates registration" on public.registrations
  for insert to authenticated with check (team_leader_id = (select auth.uid()));
create policy "Leader updates registration" on public.registrations
  for update to authenticated using (team_leader_id = (select auth.uid()) and status in ('draft', 'submitted'))
  with check (team_leader_id = (select auth.uid()) and status in ('draft', 'submitted'));

create policy "Leader reads team members" on public.registration_members
  for select to authenticated using (
    exists (select 1 from public.registrations r where r.id = registration_id and r.team_leader_id = (select auth.uid()))
  );
create policy "Leader manages team members" on public.registration_members
  for all to authenticated using (
    exists (select 1 from public.registrations r where r.id = registration_id and r.team_leader_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.registrations r where r.id = registration_id and r.team_leader_id = (select auth.uid()))
  );

-- Grant admin roles only from the new project's trusted SQL editor.
create policy "Admins manage portal config" on public.portal_config
  for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Admins manage events" on public.events
  for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Admins manage registrations" on public.registrations
  for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Admins manage members" on public.registration_members
  for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-documents', 'registration-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Users read own registration documents" on storage.objects
  for select to authenticated using (
    bucket_id = 'registration-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users upload own registration documents" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'registration-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users update own registration documents" on storage.objects
  for update to authenticated using (
    bucket_id = 'registration-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'registration-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users delete own registration documents" on storage.objects
  for delete to authenticated using (
    bucket_id = 'registration-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
