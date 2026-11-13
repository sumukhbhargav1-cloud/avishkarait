-- AVISHKAR Stage 3 portal data and permissions.
alter table public.teams
  add column assigned_repository_url text;

alter table public.registrations
  add column approved_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null;

create unique index team_members_profile_unique
  on public.team_members(profile_id) where profile_id is not null;

-- Link existing member invitations when the participant signs in later.
update public.team_members m
set profile_id = p.id
from public.profiles p
where m.profile_id is null and lower(m.email) = lower(p.email);

create or replace function public.link_profile_to_team_member()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.team_members
  set profile_id = new.id
  where profile_id is null and lower(email) = lower(new.email);
  return new;
end;
$$;
create trigger profile_links_team_member after insert on public.profiles
for each row execute function public.link_profile_to_team_member();
revoke all on function public.link_profile_to_team_member() from public, anon, authenticated;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  body text not null check (length(trim(body)) between 2 and 10000),
  audience public.app_role[] default array['participant','team_leader']::public.app_role[],
  published_at timestamptz,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_published_idx on public.announcements(published_at desc);
create trigger announcements_touch_updated_at before update on public.announcements
for each row execute function public.touch_updated_at();

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  project_title text not null check (length(trim(project_title)) between 2 and 160),
  summary text not null check (length(trim(summary)) between 10 and 10000),
  demo_url text,
  repository_url text,
  status text not null default 'submitted' check (status in ('submitted','locked')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_team_idx on public.submissions(team_id);
create trigger submissions_touch_updated_at before update on public.submissions
for each row execute function public.touch_updated_at();

-- Expose a team member's registration status through membership, not only to its leader.
create policy "team members read registration" on public.registrations
for select to authenticated using (
  leader_id = auth.uid()
  or public.has_role('admin')
  or exists (
    select 1 from public.teams t
    where t.registration_id = public.registrations.id and public.is_team_member(t.id)
  )
);

create policy "published announcements for audience" on public.announcements
for select to authenticated using (
  public.has_role('admin')
  or (published_at is not null and published_at <= now() and (
    audience is null
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any(public.announcements.audience))
  ))
);
create policy "admin manages announcements" on public.announcements
for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "team reads own submissions" on public.submissions
for select to authenticated using (public.is_team_member(team_id) or public.has_role('admin'));
create policy "leader creates own submission" on public.submissions
for insert to authenticated with check (
  submitted_by = auth.uid()
  and exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
);
create policy "leader updates own submission" on public.submissions
for update to authenticated using (
  submitted_by = auth.uid()
  and exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
) with check (
  submitted_by = auth.uid()
  and exists (select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
);
create policy "admin manages submissions" on public.submissions
for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create or replace function public.admin_update_team_details(
  p_team_id uuid,
  p_name text,
  p_institution text,
  p_domain_id uuid,
  p_assigned_repository_url text
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_registration_id uuid;
begin
  if not public.has_role('admin') then raise exception using errcode = '42501', message = 'Administrator role required.'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 100
     or length(trim(coalesce(p_institution, ''))) not between 2 and 180 then
    raise exception using errcode = '22023', message = 'Enter a valid team name and institution.';
  end if;
  if not exists(select 1 from public.domains where id = p_domain_id and is_active) then
    raise exception using errcode = '22023', message = 'Choose an active event domain.';
  end if;
  if p_assigned_repository_url is not null and p_assigned_repository_url !~* '^https://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$' then
    raise exception using errcode = '22023', message = 'Enter a valid GitHub repository URL.';
  end if;

  update public.teams set name = trim(p_name), institution = trim(p_institution), domain_id = p_domain_id,
    assigned_repository_url = nullif(trim(p_assigned_repository_url), '')
  where id = p_team_id returning registration_id into v_registration_id;
  if v_registration_id is null then raise exception using errcode = 'P0002', message = 'Team not found.'; end if;
  update public.registrations set team_name = trim(p_name), institution = trim(p_institution), domain_id = p_domain_id
  where id = v_registration_id;
end;
$$;
revoke all on function public.admin_update_team_details(uuid,text,text,uuid,text) from public, anon;
grant execute on function public.admin_update_team_details(uuid,text,text,uuid,text) to authenticated;

alter table public.announcements enable row level security;
alter table public.submissions enable row level security;

grant select, insert, update, delete on public.announcements, public.submissions to authenticated;
grant select on public.teams, public.team_members, public.registrations to authenticated;
grant update (status, approved_at, reviewed_at, reviewed_by) on public.registrations to authenticated;
grant update (name, institution, domain_id, assigned_repository_url) on public.teams to authenticated;
grant update, delete on public.team_members to authenticated;
