-- Run in Supabase SQL Editor after applying both migrations.
-- Replace all UUID placeholders with real IDs from two different participant accounts.
-- TEAM_B_ID and REGISTRATION_B_ID must belong to PARTICIPANT_B_ID.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'PARTICIPANT_A_ID', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  team_rows integer;
  member_rows integer;
  registration_rows integer;
  submission_rows integer;
begin
  select count(*) into team_rows from public.teams where id = 'TEAM_B_ID'::uuid;
  select count(*) into member_rows from public.team_members where team_id = 'TEAM_B_ID'::uuid;
  select count(*) into registration_rows from public.registrations where id = 'REGISTRATION_B_ID'::uuid;
  select count(*) into submission_rows from public.submissions where team_id = 'TEAM_B_ID'::uuid;
  if team_rows <> 0 or member_rows <> 0 or registration_rows <> 0 or submission_rows <> 0 then
    raise exception 'RLS isolation failed: participant A read rows belonging to participant B';
  end if;
end;
$$;

rollback;
