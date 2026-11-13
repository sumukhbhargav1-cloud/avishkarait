-- Align the database with the organiser-approved AVISHKAR specification.
-- Historical registrations and THE-prefixed IDs are retained. New CIVILX IDs
-- use CIV-26-0001 and the other four event prefixes remain unchanged.

alter table public.teams add column if not exists college_city text;
alter table public.teams add column if not exists college_state text;

alter table public.event_sequences drop constraint if exists event_sequences_event_code_check;
alter table public.event_sequences add constraint event_sequences_event_code_check
  check (event_code in ('CYB','FSD','IOT','MEC','CIV','THE'));

insert into public.event_sequences(event_code,next_value) values ('CIV',1)
on conflict (event_code) do nothing;

update public.domains set
  minimum_team_size=null, maximum_team_size=null,
  description='Artificial intelligence applications in cybersecurity, financial technology, intelligent security systems and innovative financial solutions.',
  event_details=$json${
    "eventCode":"CYB","focusAreas":["AI-based cybersecurity solutions","Fraud detection and financial security","Intelligent financial applications","Threat detection and analysis","Secure digital systems"],
    "challenges":[{"id":"ai-cybersecurity-fintech","name":"AI in Cybersecurity & FinTech","summary":"Develop the assigned problem statement during the hackathon.","provisional":true,"requirements":["Team size: To be announced.","No pre-built complete project.","Disclose external libraries, APIs and AI tools.","Submit source code, README or documentation, and a working demonstration.","Plagiarism and copied submissions are prohibited."],"evaluation":["Final evaluation criteria: To be announced."]}]
  }$json$::jsonb
where slug='ai-cybersecurity-fintech';

update public.domains set
  minimum_team_size=null, maximum_team_size=null,
  description='Development of functional, innovative and user-oriented digital applications using frontend and backend technologies.',
  event_details=$json${
    "eventCode":"FSD","focusAreas":["Web application development","Backend and API integration","Database-driven applications","UI/UX","Functional software solutions"],
    "challenges":[{"id":"full-stack","name":"Full Stack Development","summary":"Develop the assigned problem statement during the hackathon.","provisional":true,"requirements":["Team size: To be announced.","No pre-built complete projects.","Disclose APIs, libraries and AI tools.","Submit source code, a working demo and documentation.","Plagiarism is prohibited."],"evaluation":["Final evaluation criteria: To be announced."]}]
  }$json$::jsonb
where slug='full-stack';

update public.domains set
  minimum_team_size=2, maximum_team_size=4,
  event_details=jsonb_set(event_details,'{challenges,0,requirements}',
    '["Team size: 2 to 4 members.","Bring all required components and hardware; the college will not provide components.","Build the complete project during the hackathon.","Pre-built complete projects are not permitted."]'::jsonb)
where slug='iot-embedded';

update public.domains set
  minimum_team_size=null, maximum_team_size=4,
  description='MECHSPARK 2K26 - Mechanical Engineering. IDEAS THAT MOVE THE WORLD.',
  event_details=$json${
    "eventCode":"MEC","theme":"IDEAS THAT MOVE THE WORLD.","duration":"8 hours","focusAreas":["Mechanical design","Applied engineering","Fabrication and modelling"],
    "challenges":[
      {"id":"lathe-machine-operating","name":"Lathe Machine Operating","summary":"Practical machining and lathe operation.","maxTeamSize":4,"duration":"8 hours","requirements":["Faculty supervision is required.","Use required PPE and follow workshop safety instructions.","Organisers provide required machines, materials and equipment.","Unsafe behaviour or equipment misuse may result in disqualification."],"evaluation":["Dimensional accuracy","Surface finish","Machine handling","Time management","Safety"]},
      {"id":"solid-edge-cad-design","name":"Solid Edge CAD Design","summary":"Complete the assigned 3D model announced at the venue.","maxTeamSize":4,"duration":"8 hours","requirements":["Previously prepared models are not permitted.","Submit the final design files."],"evaluation":["Design accuracy","Creativity","Modelling skills","Dimensions","Completion time"]},
      {"id":"cardboard-mechanical-model","name":"Cardboard Mechanical Model Making","summary":"Build and demonstrate a working mechanical model using organiser-provided cardboard and permitted materials.","maxTeamSize":4,"duration":"8 hours","requirements":["No pre-built models.","Demonstrate the working mechanism and engineering principle."],"evaluation":["Innovation","Working mechanism","Strength and stability","Engineering application","Presentation"]}
    ]
  }$json$::jsonb
where slug='mechspark';

update public.domains set
  slug='civilx',name='CIVILX - Civil Engineering & Structural Innovation',
  description='Civil engineering challenges in structural design, AutoCAD and field surveying.',
  minimum_team_size=null,maximum_team_size=null,
  event_details=$json${
    "eventCode":"CIV","focusAreas":["Structural design","Civil CAD","Surveying and field levelling"],
    "challenges":[
      {"id":"bridge-x","name":"BRIDGE-X","summary":"Build a bridge using organiser-provided materials. Completed bridges undergo gradual load testing.","minTeamSize":4,"maxTeamSize":4,"requirements":["Team size: exactly 4 members.","Bridge materials are provided by organisers."],"evaluation":["Load capacity: 30%","Structural stability: 25%","Material efficiency: 15%","Innovation/design: 15%","Construction quality: 15%"]},
      {"id":"cadathon","name":"CADATHON","summary":"Round 1: an offline quiz with approximately 20-30 MCQs in 20-30 minutes. The top 10 teams advance to a 90-minute AutoCAD residential building design challenge.","minTeamSize":2,"maxTeamSize":2,"duration":"90 minutes","requirements":["Team size: exactly 2 members.","Submit a floor plan, elevation, cross-section and schedule of openings.","No pre-made drawings or pre-drafted geometry.","No internet access.","Basic AutoCAD templates without pre-drawn geometry are permitted."],"evaluation":["Planning and space utilisation: 25%","Vastu: 15%","Sustainability: 15%","Drawing accuracy: 20%","Elevation/section quality: 15%","Presentation: 10%"]},
      {"id":"surveyor-x","name":"SURVEYOR-X","summary":"An offline quiz with approximately 20-30 MCQs in 20-30 minutes, followed by practical field levelling.","minTeamSize":4,"maxTeamSize":4,"requirements":["Team size: exactly 4 members.","Record staff readings and calculate reduced levels and elevation differences.","Participants bring a calculator.","Organisers provide a Dumpy/Auto Level, levelling staff, tripod and field sheet."],"evaluation":["Accuracy: 30%","RL/HI calculations: 25%","Instrument handling: 15%","Field book: 15%","Time: 10%","Coordination: 5%"]}
    ]
  }$json$::jsonb
where slug='theodo';

-- Keep old THE sequence history intact; all new records read CIV from the
-- current CIVILX domain JSON and are allocated atomically by the existing trigger.
create table if not exists public.event_sequences (
  event_code text primary key,
  next_value integer not null default 1
);
alter table public.event_sequences enable row level security;
revoke all on public.event_sequences from public,anon,authenticated;

create or replace function public.generate_next_team_uid(p_event_code text)
returns text language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_number integer;
begin
  if p_event_code not in ('CYB','FSD','IOT','MEC','CIV','THE') then
    raise exception using errcode='22023',message='Invalid event code.';
  end if;
  insert into public.event_sequences as seq(event_code,next_value) values(p_event_code,2)
  on conflict(event_code) do update set next_value=seq.next_value+1
  returning next_value-1 into v_number;
  return p_event_code||'-26-'||lpad(v_number::text,4,'0');
end;
$$;
revoke all on function public.generate_next_team_uid(text) from public,anon,authenticated;

-- Extend the existing atomic batch RPC only to persist each college location.
create or replace function public.submit_team_registrations(
  p_leader_name text,p_leader_email text,p_leader_phone text,p_leader_github text,p_teams jsonb
)
returns table(registration_id uuid,registration_reference text,registration_status text,team_id uuid,domain_name text)
language plpgsql security definer set search_path=public,extensions,pg_temp
as $$
declare
  v_user_id uuid:=auth.uid(); v_auth_email text; v_email_confirmed_at timestamptz;
  v_team jsonb; v_member jsonb; v_domain public.domains%rowtype; v_challenge jsonb;
  v_team_size integer; v_min integer; v_max integer; v_registration_id uuid;
  v_team_id uuid; v_reference text;
begin
  if v_user_id is null then raise exception using errcode='28000',message='Sign in with a verified team leader email before registering.'; end if;
  select lower(email),email_confirmed_at into v_auth_email,v_email_confirmed_at from auth.users where id=v_user_id;
  if v_auth_email is null or v_email_confirmed_at is null or lower(trim(coalesce(p_leader_email,'')))<>v_auth_email then raise exception using errcode='28000',message='Verify the team leader email and use the signed-in account.'; end if;
  if length(trim(coalesce(p_leader_name,''))) not between 2 and 120 then raise exception using errcode='22023',message='Enter a valid team leader name.'; end if;
  if length(trim(coalesce(p_leader_phone,''))) not between 7 and 20 or trim(coalesce(p_leader_phone,'')) !~ '^[+0-9() .-]+$' then raise exception using errcode='22023',message='Enter a valid team leader phone number.'; end if;
  if nullif(trim(p_leader_github),'') is not null and trim(p_leader_github) !~ '^[A-Za-z0-9-]{1,39}$' then raise exception using errcode='22023',message='Enter a valid team leader GitHub username.'; end if;
  if p_teams is null or jsonb_typeof(p_teams)<>'array' or jsonb_array_length(p_teams)<1 or jsonb_array_length(p_teams)>5 then raise exception using errcode='22023',message='Add between one and five domain teams.'; end if;
  if exists(select 1 from jsonb_array_elements(p_teams) as x(value) group by value->>'domainId' having count(*)>1) then raise exception using errcode='22023',message='Register at most one team per domain in a submission.'; end if;
  update public.profiles set full_name=trim(p_leader_name),phone=trim(p_leader_phone),github_username=nullif(trim(p_leader_github),''),role='team_leader' where id=v_user_id;
  for v_team in select value from jsonb_array_elements(p_teams) loop
    select * into v_domain from public.domains where id=(v_team->>'domainId')::uuid and is_active;
    if not found then raise exception using errcode='22023',message='A selected event domain is not active.'; end if;
    if not v_domain.registration_open then raise exception using errcode='22023',message='Registration is not open for '||v_domain.name||'.'; end if;
    if not coalesce((v_team->>'rulesAccepted')::boolean,false) then raise exception using errcode='22023',message='Accept the published event guidelines before continuing.'; end if;
    if length(trim(coalesce(v_team->>'teamName',''))) not between 2 and 100 or length(trim(coalesce(v_team->>'institution',''))) not between 2 and 180 then raise exception using errcode='22023',message='Check each team name and college.'; end if;
    if length(trim(coalesce(v_team->>'city',''))) not between 2 and 100 or length(trim(coalesce(v_team->>'state',''))) not between 2 and 100 then raise exception using errcode='22023',message='Enter the college city and state for each team.'; end if;
    if nullif(trim(v_team->>'repositoryUrl'),'') is not null and trim(v_team->>'repositoryUrl') !~* '^https://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$' then raise exception using errcode='22023',message='Enter a valid GitHub repository URL.'; end if;
    if jsonb_typeof(v_team->'members') is distinct from 'array' then raise exception using errcode='22023',message='Team member details are required.'; end if;
    v_team_size:=jsonb_array_length(v_team->'members')+1; v_min:=v_domain.minimum_team_size; v_max:=v_domain.maximum_team_size;
    v_challenge:=null;
    select value into v_challenge from jsonb_array_elements(coalesce(v_domain.event_details->'challenges','[]'::jsonb)) c where value->>'id'=v_team->>'challengeId' limit 1;
    if v_challenge is null then raise exception using errcode='22023',message='Choose a valid challenge for '||v_domain.name||'.'; end if;
    v_min:=coalesce(nullif(v_challenge->>'minTeamSize','')::integer,v_min); v_max:=coalesce(nullif(v_challenge->>'maxTeamSize','')::integer,v_max);
    if v_min is not null and v_team_size<v_min then raise exception using errcode='22023',message='The selected challenge requires at least '||v_min||' team members.'; end if;
    if v_max is not null and v_team_size>v_max then raise exception using errcode='22023',message='The selected challenge allows no more than '||v_max||' team members.'; end if;
    if exists(select 1 from (select lower(trim(coalesce(m.value->>'email',''))) email from jsonb_array_elements(v_team->'members') as m(value) union all select v_auth_email) e group by email having email='' or count(*)>1) then raise exception using errcode='22023',message='Each team must use unique member email addresses.'; end if;
    for v_member in select value from jsonb_array_elements(v_team->'members') loop
      if length(trim(coalesce(v_member->>'fullName',''))) not between 2 and 120 or coalesce(v_member->>'email','') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023',message='Check each team member name and email.'; end if;
      if nullif(trim(v_member->>'githubUsername'),'') is not null and trim(v_member->>'githubUsername') !~ '^[A-Za-z0-9-]{1,39}$' then raise exception using errcode='22023',message='Enter a valid GitHub username.'; end if;
    end loop;
    insert into public.registrations(leader_id,team_name,institution,domain_id,challenge_id,repository_url,rules_accepted_at)
    values(v_user_id,trim(v_team->>'teamName'),trim(v_team->>'institution'),v_domain.id,v_challenge->>'id',nullif(trim(v_team->>'repositoryUrl'),''),now())
    returning id,reference_id into v_registration_id,v_reference;
    insert into public.teams(registration_id,name,institution,domain_id,challenge_id,leader_id,college_city,college_state)
    values(v_registration_id,trim(v_team->>'teamName'),trim(v_team->>'institution'),v_domain.id,v_challenge->>'id',v_user_id,trim(v_team->>'city'),trim(v_team->>'state'))
    returning id into v_team_id;
    insert into public.team_members(team_id,profile_id,full_name,email,github_username,is_leader)
    values(v_team_id,v_user_id,trim(p_leader_name),v_auth_email,nullif(trim(p_leader_github),''),true);
    for v_member in select value from jsonb_array_elements(v_team->'members') loop
      insert into public.team_members(team_id,full_name,email,github_username,is_leader)
      values(v_team_id,trim(v_member->>'fullName'),lower(trim(v_member->>'email')),nullif(trim(v_member->>'githubUsername'),''),false);
    end loop;
    update public.team_members tm set profile_id=p.id from public.profiles p where tm.team_id=v_team_id and tm.profile_id is null and lower(tm.email)=lower(p.email);
    registration_id:=v_registration_id; registration_reference:=v_reference; registration_status:='pending'; team_id:=v_team_id; domain_name:=v_domain.name; return next;
  end loop;
exception when unique_violation then
  raise exception using errcode='23505',message='An account or member email is already registered on this team.';
end;
$$;
revoke all on function public.submit_team_registrations(text,text,text,text,jsonb) from public,anon;
grant execute on function public.submit_team_registrations(text,text,text,text,jsonb) to authenticated;

create or replace function public.admin_update_team_details_v2(
  p_team_id uuid,p_name text,p_institution text,p_domain_id uuid,p_assigned_repository_url text,p_city text,p_state text
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_registration_id uuid;
begin
  if not public.has_role('admin') then raise exception using errcode='42501',message='Administrator role required.'; end if;
  select registration_id into v_registration_id from public.teams where id=p_team_id;
  if v_registration_id is null then raise exception using errcode='P0002',message='Team not found.'; end if;
  update public.teams set name=trim(p_name),institution=trim(p_institution),domain_id=p_domain_id,
    assigned_repository_url=nullif(trim(p_assigned_repository_url),''),college_city=trim(p_city),college_state=trim(p_state)
  where id=p_team_id;
  update public.registrations set team_name=trim(p_name),institution=trim(p_institution),domain_id=p_domain_id where id=v_registration_id;
end;
$$;
revoke all on function public.admin_update_team_details_v2(uuid,text,text,uuid,text,text,text) from public,anon;
grant execute on function public.admin_update_team_details_v2(uuid,text,text,uuid,text,text,text) to authenticated;

