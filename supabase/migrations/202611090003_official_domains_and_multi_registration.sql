-- Official AVISHKAR domain information and multi-team registration.
-- Registration opens are deliberately closed until an organiser confirms them.
alter table public.domains
  add column minimum_team_size integer,
  add column maximum_team_size integer,
  add column registration_open boolean not null default false,
  add column event_details jsonb not null default '{}'::jsonb;

alter table public.domains add constraint domains_min_team_size_positive check (minimum_team_size is null or minimum_team_size >= 1);
alter table public.domains add constraint domains_team_size_range check (maximum_team_size is null or maximum_team_size >= coalesce(minimum_team_size, 1));

alter table public.registrations drop constraint if exists registrations_leader_id_key;
alter table public.teams drop constraint if exists teams_leader_id_key;
drop index if exists public.team_members_email_lower_unique;
drop index if exists public.team_members_profile_unique;
create unique index team_members_team_email_lower_unique on public.team_members(team_id, lower(email));

alter table public.registrations add column challenge_id text;
alter table public.teams add column challenge_id text;
create unique index registrations_leader_domain_unique on public.registrations(leader_id, domain_id);

update public.domains set
  name='AI in Cybersecurity & FinTech', slug='ai-cybersecurity-fintech',
  description='Build secure, intelligent digital systems for financial services and cyber resilience.',
  minimum_team_size=null, maximum_team_size=null,
  event_details=jsonb_build_object(
    'focusAreas',jsonb_build_array('AI-based cybersecurity solutions','Fraud detection and financial security','Intelligent financial applications','Threat detection and analysis','Secure digital systems'),
    'challenges',jsonb_build_array(jsonb_build_object('id','ai-cybersecurity-fintech','name','AI in Cybersecurity & FinTech','summary','Develop a solution in the domain focus areas.','requirements',jsonb_build_array('Team size and final duration: To be announced.'),'evaluation',jsonb_build_array('Evaluation criteria: To be announced.')))
  ) where slug='ai-cybersecurity-fintech';

update public.domains set
  name='Full Stack Development',
  description='Design and deliver a functional software solution across the interface, backend and data layers.',
  minimum_team_size=null, maximum_team_size=null,
  event_details=jsonb_build_object(
    'focusAreas',jsonb_build_array('Web application development','Backend and API integration','Database-driven applications','UI/UX design','Functional software solutions'),
    'challenges',jsonb_build_array(jsonb_build_object('id','full-stack','name','Full Stack Development','summary','Build a working application for a problem to be announced.','requirements',jsonb_build_array('Team size and final duration: To be announced.'),'evaluation',jsonb_build_array('Evaluation criteria: To be announced.')))
  ) where slug='full-stack';

update public.domains set
  name='IoT & Embedded Systems',
  description='Build a complete connected or embedded project during the hackathon.',
  minimum_team_size=2, maximum_team_size=4,
  event_details=jsonb_build_object(
    'focusAreas',jsonb_build_array('Connected devices','Embedded systems','Intelligent sensing'),
    'challenges',jsonb_build_array(jsonb_build_object('id','iot-embedded','name','IoT & Embedded Systems','summary','Build and demonstrate a complete IoT or embedded project.','minTeamSize',2,'maxTeamSize',4,'requirements',jsonb_build_array('Teams must have 2â€“4 members.','Participants must bring all required components and hardware. The college will not provide components.','The complete project must be built during the hackathon.','Pre-built complete projects are not permitted.'),'evaluation',jsonb_build_array('Evaluation criteria: To be announced.')))
  ) where slug='iot-embedded';

update public.domains set
  name='MECHSPARK 2K26', description='Mechanical engineering challenges in design, machining and working models.',
  minimum_team_size=null, maximum_team_size=4,
  event_details=jsonb_build_object(
    'theme','IDEAS THAT MOVE THE WORLD.','duration','8 hours',
    'focusAreas',jsonb_build_array('Mechanical design','Applied engineering','Fabrication and modelling'),
    'challenges',jsonb_build_array(
      jsonb_build_object('id','lathe-machine-operating','name','Lathe Machine Operating','summary','Supervised practical machining.','maxTeamSize',4,'duration','8 hours','requirements',jsonb_build_array('Workshop supervision is required.','PPE and workshop safety requirements apply.'),'evaluation',jsonb_build_array('Dimensional accuracy','Surface finish','Time management','PPE and workshop safety')),
      jsonb_build_object('id','solid-edge-cad-design','name','Solid Edge CAD Design','summary','Complete the assigned 3D modelling task announced at the venue.','maxTeamSize',4,'duration','8 hours','requirements',jsonb_build_array('The task is announced at the venue.','Previously prepared models are not permitted.'),'evaluation',jsonb_build_array('Challenge-specific scoring criteria: To be announced.')),
      jsonb_build_object('id','cardboard-mechanical-model','name','Cardboard Mechanical Model Making','summary','Construct and demonstrate a working mechanical model.','maxTeamSize',4,'duration','8 hours','requirements',jsonb_build_array('Organiser-provided cardboard and permitted materials are used.'),'evaluation',jsonb_build_array('Working model demonstration','Additional scoring criteria: To be announced.'))
    )
  ) where slug='mechspark';

update public.domains set
  name='CIVILX: Civil Engineering & Structural Innovation',
  description='Apply civil engineering skills to structural design, drafting and surveying challenges.',
  minimum_team_size=null, maximum_team_size=null,
  event_details=jsonb_build_object(
    'focusAreas',jsonb_build_array('Structural innovation','CAD and building design','Surveying and field levelling'),
    'challenges',jsonb_build_array(
      jsonb_build_object('id','bridge-x','name','BRIDGE-X','summary','Build a bridge using organiser-provided materials and take part in gradual load testing.','minTeamSize',4,'maxTeamSize',4,'requirements',jsonb_build_array('Bridge construction materials are provided by organisers.','Load testing is gradual.'),'evaluation',jsonb_build_array('Load capacity â€” 30%','Structural stability â€” 25%','Material efficiency â€” 15%','Innovation/design â€” 15%','Construction quality â€” 15%')),
      jsonb_build_object('id','cadathon','name','CADATHON','summary','Offline quiz followed by a 90-minute AutoCAD residential building design challenge for the top 10 teams.','minTeamSize',2,'maxTeamSize',2,'duration','90 minutes','requirements',jsonb_build_array('Submit a floor plan, elevation, cross-section and schedule of openings.','No pre-made drawings or pre-drafted geometry.','No internet during the challenge.'),'evaluation',jsonb_build_array('Planning â€” 25%','Vastu â€” 15%','Sustainability â€” 15%','Drawing accuracy â€” 20%','Elevation/section quality â€” 15%','Presentation â€” 10%')),
      jsonb_build_object('id','surveyor-x','name','SURVEYOR-X','summary','Offline quiz followed by practical field levelling.','minTeamSize',4,'maxTeamSize',4,'requirements',jsonb_build_array('Participants bring a calculator.','Organisers provide surveying equipment and field sheets.'),'evaluation',jsonb_build_array('Accuracy â€” 30%','RL/HI calculations â€” 25%','Instrument handling â€” 15%','Field book â€” 15%','Time â€” 10%','Coordination â€” 5%'))
    )
  ) where slug='sustainable';

-- The previous Stage 2 RPC accepts one team and has no challenge or registration
-- availability checks. Remove its public authenticated entry point.
revoke all on function public.submit_team_registration(text,text,uuid,text,text,text,text,jsonb,text,boolean) from public, anon, authenticated;

create or replace function public.submit_team_registrations(
  p_leader_name text,
  p_leader_email text,
  p_leader_phone text,
  p_leader_github text,
  p_teams jsonb
)
returns table(registration_id uuid, registration_reference text, registration_status text, team_id uuid, domain_name text)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_email text;
  v_email_confirmed_at timestamptz;
  v_team jsonb;
  v_member jsonb;
  v_domain public.domains%rowtype;
  v_challenge jsonb;
  v_team_size integer;
  v_min integer;
  v_max integer;
  v_registration_id uuid;
  v_team_id uuid;
  v_reference text;
  v_count integer := 0;
begin
  if v_user_id is null then raise exception using errcode='28000', message='Sign in with a verified team leader email before registering.'; end if;
  select lower(email),email_confirmed_at into v_auth_email,v_email_confirmed_at from auth.users where id=v_user_id;
  if v_auth_email is null or v_email_confirmed_at is null or lower(trim(coalesce(p_leader_email,'')))<>v_auth_email then raise exception using errcode='28000', message='Verify the team leader email and use the signed-in account.'; end if;
  if length(trim(coalesce(p_leader_name,''))) not between 2 and 120 then raise exception using errcode='22023', message='Enter a valid team leader name.'; end if;
  if length(trim(coalesce(p_leader_phone,''))) not between 7 and 20 then raise exception using errcode='22023', message='Enter a valid team leader phone number.'; end if;
  if trim(coalesce(p_leader_phone,'')) !~ '^[+0-9() .-]+$' then raise exception using errcode='22023', message='Enter a valid team leader phone number.'; end if;
  if nullif(trim(p_leader_github),'') is not null and trim(p_leader_github) !~ '^[A-Za-z0-9-]{1,39}$' then raise exception using errcode='22023', message='Enter a valid team leader GitHub username.'; end if;
  if p_teams is null or jsonb_typeof(p_teams)<>'array' or jsonb_array_length(p_teams)<1 or jsonb_array_length(p_teams)>5 then raise exception using errcode='22023', message='Add between one and five domain teams.'; end if;
  if exists(select 1 from jsonb_array_elements(p_teams) as x(value) group by value->>'domainId' having count(*)>1) then raise exception using errcode='22023', message='Register at most one team per domain in a submission.'; end if;

  update public.profiles set full_name=trim(p_leader_name),phone=trim(p_leader_phone),github_username=nullif(trim(p_leader_github),''),role='team_leader' where id=v_user_id;

  for v_team in select value from jsonb_array_elements(p_teams) loop
    select * into v_domain from public.domains where id=(v_team->>'domainId')::uuid and is_active;
    if not found then raise exception using errcode='22023', message='A selected event domain is not active.'; end if;
    if not v_domain.registration_open then raise exception using errcode='22023', message='Registration is not open for '||v_domain.name||'.'; end if;
    if not coalesce((v_team->>'rulesAccepted')::boolean,false) then raise exception using errcode='22023', message='Accept the rules for each team before continuing.'; end if;
    if length(trim(coalesce(v_team->>'teamName',''))) not between 2 and 100 or length(trim(coalesce(v_team->>'institution',''))) not between 2 and 180 then raise exception using errcode='22023', message='Check each team name and college.'; end if;
    if nullif(trim(v_team->>'repositoryUrl'),'') is not null and trim(v_team->>'repositoryUrl') !~* '^https://(www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$' then raise exception using errcode='22023', message='Enter a valid GitHub repository URL.'; end if;
    if jsonb_typeof(v_team->'members') is distinct from 'array' then raise exception using errcode='22023', message='Team member details are required.'; end if;
    v_team_size:=jsonb_array_length(v_team->'members')+1;
    v_min:=v_domain.minimum_team_size; v_max:=v_domain.maximum_team_size;
    v_challenge:=null;
    select value into v_challenge from jsonb_array_elements(coalesce(v_domain.event_details->'challenges','[]'::jsonb)) c where value->>'id'=v_team->>'challengeId' limit 1;
    if v_challenge is null then raise exception using errcode='22023', message='Choose a valid challenge for '||v_domain.name||'.'; end if;
    v_min:=coalesce(nullif(v_challenge->>'minTeamSize','')::integer,v_min);
    v_max:=coalesce(nullif(v_challenge->>'maxTeamSize','')::integer,v_max);
    if v_min is not null and v_team_size<v_min then raise exception using errcode='22023', message='The selected challenge requires at least '||v_min||' team members.'; end if;
    if v_max is not null and v_team_size>v_max then raise exception using errcode='22023', message='The selected challenge allows no more than '||v_max||' team members.'; end if;
    if exists(select 1 from (select lower(trim(coalesce(m.value->>'email',''))) email from jsonb_array_elements(v_team->'members') as m(value) union all select v_auth_email) e group by email having email='' or count(*)>1) then raise exception using errcode='22023', message='Each team must use unique member email addresses.'; end if;
    for v_member in select value from jsonb_array_elements(v_team->'members') loop
      if length(trim(coalesce(v_member->>'fullName',''))) not between 2 and 120 or coalesce(v_member->>'email','') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception using errcode='22023', message='Check each team member name and email.'; end if;
      if nullif(trim(v_member->>'githubUsername'),'') is not null and trim(v_member->>'githubUsername') !~ '^[A-Za-z0-9-]{1,39}$' then raise exception using errcode='22023', message='Enter a valid GitHub username.'; end if;
    end loop;
    insert into public.registrations(leader_id,team_name,institution,domain_id,challenge_id,repository_url,rules_accepted_at)
      values(v_user_id,trim(v_team->>'teamName'),trim(v_team->>'institution'),v_domain.id,v_challenge->>'id',nullif(trim(v_team->>'repositoryUrl'),''),now())
      returning id,reference_id into v_registration_id,v_reference;
    insert into public.teams(registration_id,name,institution,domain_id,challenge_id,leader_id)
      values(v_registration_id,trim(v_team->>'teamName'),trim(v_team->>'institution'),v_domain.id,v_challenge->>'id',v_user_id) returning id into v_team_id;
    insert into public.team_members(team_id,profile_id,full_name,email,github_username,is_leader)
      values(v_team_id,v_user_id,trim(p_leader_name),v_auth_email,nullif(trim(p_leader_github),''),true);
    for v_member in select value from jsonb_array_elements(v_team->'members') loop
      insert into public.team_members(team_id,full_name,email,github_username,is_leader)
        values(v_team_id,trim(v_member->>'fullName'),lower(trim(v_member->>'email')),nullif(trim(v_member->>'githubUsername'),''),false);
    end loop;
    update public.team_members tm set profile_id=p.id from public.profiles p where tm.team_id=v_team_id and tm.profile_id is null and lower(tm.email)=lower(p.email);
    v_count:=v_count+1;
    registration_id:=v_registration_id; registration_reference:=v_reference; registration_status:='pending'; team_id:=v_team_id; domain_name:=v_domain.name; return next;
  end loop;
exception when unique_violation then
  raise exception using errcode='23505', message='An account or member email is already registered on this team.';
end;
$$;
revoke all on function public.submit_team_registrations(text,text,text,text,jsonb) from public,anon;
grant execute on function public.submit_team_registrations(text,text,text,text,jsonb) to authenticated;

grant select on public.domains to anon, authenticated;
grant update (description,event_details,minimum_team_size,maximum_team_size,registration_open,is_active) on public.domains to authenticated;
