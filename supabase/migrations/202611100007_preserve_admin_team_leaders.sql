-- Keep administrator accounts administrators when they also lead teams.
-- Existing registrations continue to identify team leaders by teams.leader_id.

create or replace function public.preserve_admin_role_on_registration()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.role = 'admin' and new.role = 'team_leader' then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

create trigger preserve_admin_role_on_registration
before update of role on public.profiles
for each row
execute function public.preserve_admin_role_on_registration();

revoke all on function public.preserve_admin_role_on_registration() from public, anon, authenticated;
