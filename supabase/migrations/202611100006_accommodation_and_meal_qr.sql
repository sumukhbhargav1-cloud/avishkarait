-- Participant accommodation requests and per-team meal check-in QR tokens.
-- Apply after 202611100005_civilx_official_rules.sql.

alter table public.teams
  add column meal_qr_token text not null default replace(gen_random_uuid()::text, '-', '');
create unique index teams_meal_qr_token_unique on public.teams(meal_qr_token);

create table public.accommodation_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  participant_count integer not null check (participant_count between 1 and 10),
  arrival_date date not null,
  departure_date date not null,
  notes text not null default '' check (length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','confirmed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accommodation_dates_order check (departure_date > arrival_date)
);
create trigger accommodation_requests_touch_updated_at
  before update on public.accommodation_requests
  for each row execute function public.touch_updated_at();

create table public.meal_checkins (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner')),
  scanned_by uuid not null references public.profiles(id) on delete restrict,
  scanned_at timestamptz not null default now(),
  unique (team_id, meal_date, meal_type)
);
create index meal_checkins_date_meal_idx on public.meal_checkins(meal_date, meal_type);

alter table public.accommodation_requests enable row level security;
alter table public.meal_checkins enable row level security;

create policy "team members read own accommodation"
  on public.accommodation_requests for select to authenticated
  using (public.is_team_member(team_id) or public.has_role('admin'));
create policy "team leader submits accommodation request"
  on public.accommodation_requests for insert to authenticated
  with check (
    status = 'pending'
    and exists(select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
  );
create policy "team leader updates accommodation request"
  on public.accommodation_requests for update to authenticated
  using (exists(select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid()))
  with check (
    status = 'pending'
    and exists(select 1 from public.teams t where t.id = team_id and t.leader_id = auth.uid())
  );
create policy "admin manages accommodation requests"
  on public.accommodation_requests for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "team members read own meal checkins"
  on public.meal_checkins for select to authenticated
  using (public.is_team_member(team_id) or public.has_role('admin'));
create policy "admin manages meal checkins"
  on public.meal_checkins for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

grant select on public.accommodation_requests, public.meal_checkins to authenticated;
grant insert, update on public.accommodation_requests to authenticated;
grant insert, select on public.meal_checkins to authenticated;
