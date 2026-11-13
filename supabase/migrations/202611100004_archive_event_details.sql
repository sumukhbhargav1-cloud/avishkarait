-- Carry the event codes and challenge details from the supplied hackathon archive
-- into the editable event records. Existing registration references remain intact.
update public.domains set
  slug = 'ai-cybersecurity-fintech', name = 'AI in Cybersecurity & FinTech',
  minimum_team_size = 2, maximum_team_size = 4,
  event_details = $json${
    "eventCode":"CYB",
    "focusAreas":["AI-based cybersecurity solutions","Fraud detection and financial security","Intelligent financial applications","Threat detection and analysis","Secure digital systems"],
    "challenges":[{"id":"ai-cybersecurity-fintech","name":"AI in Cybersecurity & FinTech","summary":"Develop an original solution for digital security, financial technology, fraud detection or emerging cyber threats.","minTeamSize":2,"maxTeamSize":4,"requirements":["Teams must have 2 to 4 members.","Complete project development within the hackathon duration.","Pre-built complete projects are not allowed.","Disclose external libraries, APIs and AI tools during submission."],"evaluation":["Submit the source repository and demonstrate a working solution to the judging panel.","Additional evaluation criteria: To be announced."]}]
  }$json$::jsonb
where slug = 'ai-cybersecurity-fintech';

update public.domains set
  name = 'Full Stack Development', minimum_team_size = 2, maximum_team_size = 4,
  event_details = $json${
    "eventCode":"FSD",
    "focusAreas":["Web application development","Backend and API integration","Database-driven applications","UI/UX design","Functional software solutions"],
    "challenges":[{"id":"full-stack","name":"Full Stack Development","summary":"Build a functional application for a problem statement announced at the event.","minTeamSize":2,"maxTeamSize":4,"requirements":["Teams must have 2 to 4 members.","Complete development during the hackathon timeline.","Pre-built complete projects or boilerplate products are not allowed.","External frameworks, open-source libraries and public APIs are permitted."],"evaluation":["Submit complete source code with clear commit history and demonstrate the working application.","Additional evaluation criteria: To be announced."]}]
  }$json$::jsonb
where slug = 'full-stack';

update public.domains set
  name = 'IoT & Embedded Systems', minimum_team_size = 2, maximum_team_size = 4,
  event_details = $json${
    "eventCode":"IOT",
    "focusAreas":["Connected devices","Embedded systems","Intelligent sensing"],
    "challenges":[{"id":"iot-embedded","name":"IoT & Embedded Systems","summary":"Create and demonstrate a complete hardware and software prototype.","minTeamSize":2,"maxTeamSize":4,"requirements":["Teams must have 2 to 4 members.","Participants must bring all required components, sensors, microcontrollers and hardware tools; the college will not provide components.","Build the complete hardware and software prototype during the hackathon.","Pre-built complete projects or ready-made circuits are not permitted."],"evaluation":["Demonstrate the complete working prototype.","Additional evaluation criteria: To be announced."]}]
  }$json$::jsonb
where slug = 'iot-embedded';

update public.domains set
  name = 'MECHSPARK 2K26', minimum_team_size = 2, maximum_team_size = 4,
  event_details = $json${
    "eventCode":"MEC","theme":"THINK. DESIGN. BUILD. WIN.","duration":"8 hours",
    "focusAreas":["Mechanical design","Applied engineering","Fabrication and modelling"],
    "challenges":[
      {"id":"lathe-machine-operating","name":"Lathe Machine Operating Challenge","summary":"Precision machining, metal turning and dimensional tolerance evaluation on workshop lathe machines.","minTeamSize":2,"maxTeamSize":4,"duration":"8 hours","requirements":["Complete all assigned tasks within the 8-hour event duration.","Materials, machines and workshop equipment are provided by organisers.","Workshop supervision, PPE and workshop safety requirements apply."],"evaluation":["Engineering innovation","Practical skills","Dimensional accuracy","Safety protocol adherence"]},
      {"id":"solid-edge-cad-design","name":"Solid Edge CAD Design Challenge","summary":"Parametric 3D mechanical modelling, assembly constraints and drafting under timed conditions.","minTeamSize":2,"maxTeamSize":4,"duration":"8 hours","requirements":["Complete the assigned task within the event duration.","Previously prepared models are not permitted."],"evaluation":["Challenge-specific scoring criteria: To be announced."]},
      {"id":"cardboard-mechanical-model","name":"Cardboard Model Making Challenge","summary":"Rapid physical mechanism prototyping, structural stability and kinematics using cardboard fabrication.","minTeamSize":2,"maxTeamSize":4,"duration":"8 hours","requirements":["Use organiser-provided cardboard and permitted materials."],"evaluation":["Working model demonstration","Additional scoring criteria: To be announced."]}
    ]
  }$json$::jsonb
where slug = 'mechspark';

update public.domains set
  slug = 'theodo', name = 'THEODO — Civil Engineering',
  minimum_team_size = null, maximum_team_size = 4,
  description = 'Three civil engineering challenges in structural design, CAD and field surveying.',
  event_details = $json${
    "eventCode":"THE",
    "focusAreas":["Structural design","Civil CAD","Surveying and field levelling"],
    "challenges":[
      {"id":"bridge-x","name":"BRIDGE-X","summary":"Construct a bridge using organiser-provided materials and take part in load testing.","minTeamSize":4,"maxTeamSize":4,"requirements":["Team size: exactly 4 members.","Construct the bridge using organiser-provided materials within the allotted time."],"evaluation":["Load capacity — 30%","Structural stability — 25%","Material efficiency — 15%","Innovation and design — 15%","Construction quality — 15%"]},
      {"id":"cadathon","name":"CADATHON","summary":"A technical CAD quiz followed by an AutoCAD residential building design challenge; the top 10 teams advance to the final design round.","minTeamSize":2,"maxTeamSize":2,"duration":"90 minutes","requirements":["Team size: exactly 2 members.","Submit a floor plan, elevation, cross-section and schedule of openings.","Pre-prepared drawings or templates are not permitted.","No internet during the challenge."],"evaluation":["Planning — 25%","Vastu — 15%","Sustainability — 15%","Drawing accuracy — 20%","Elevation and section quality — 15%","Presentation — 10%"]},
      {"id":"surveyor-x","name":"SURVEYOR-X","summary":"A surveying quiz followed by practical field levelling.","minTeamSize":4,"maxTeamSize":4,"requirements":["Team size: exactly 4 members.","Bring a scientific calculator.","Organisers provide surveying equipment and field sheets."],"evaluation":["Accuracy — 30%","RL and HI calculations — 25%","Instrument handling — 15%","Field book — 15%","Time — 10%","Coordination — 5%"]}
    ]
  }$json$::jsonb
where slug = 'sustainable';

-- The archive uses domain-prefixed team IDs (for example, CYB-26-0001).
-- Keep the existing AV26 registration reference as a separate stable identifier.
create table if not exists public.event_sequences (
  event_code text primary key check (event_code in ('CYB','FSD','IOT','THE','MEC')),
  next_value integer not null default 1 check (next_value > 0)
);
alter table public.event_sequences enable row level security;
revoke all on public.event_sequences from public, anon, authenticated;

alter table public.registrations add column if not exists team_uid text;

with numbered as (
  select r.id,
         d.event_details->>'eventCode' as event_code,
         row_number() over (partition by d.event_details->>'eventCode' order by r.created_at, r.id) as ordinal
  from public.registrations r
  join public.domains d on d.id = r.domain_id
)
update public.registrations r
set team_uid = n.event_code || '-26-' || lpad(n.ordinal::text, 4, '0')
from numbered n
where r.id = n.id and r.team_uid is null;

alter table public.registrations alter column team_uid set not null;
create unique index if not exists registrations_team_uid_unique on public.registrations(team_uid);

insert into public.event_sequences(event_code, next_value)
select d.event_details->>'eventCode', coalesce(max(split_part(r.team_uid, '-', 3)::integer), 0) + 1
from public.domains d
left join public.registrations r on r.domain_id = d.id
where d.event_details->>'eventCode' is not null
group by d.event_details->>'eventCode'
on conflict (event_code) do update
set next_value = greatest(public.event_sequences.next_value, excluded.next_value);

create or replace function public.generate_next_team_uid(p_event_code text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_number integer;
begin
  if p_event_code not in ('CYB','FSD','IOT','THE','MEC') then
    raise exception using errcode='22023', message='Invalid event code.';
  end if;
  insert into public.event_sequences as seq(event_code, next_value)
  values(p_event_code, 2)
  on conflict(event_code) do update set next_value = seq.next_value + 1
  returning next_value - 1 into v_number;
  return p_event_code || '-26-' || lpad(v_number::text, 4, '0');
end;
$$;

create or replace function public.assign_registration_team_uid()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_event_code text;
begin
  select event_details->>'eventCode' into v_event_code
  from public.domains where id = new.domain_id;
  if v_event_code is null then
    raise exception using errcode='22023', message='The selected event has no team ID code.';
  end if;
  new.team_uid := public.generate_next_team_uid(v_event_code);
  return new;
end;
$$;

revoke all on function public.generate_next_team_uid(text) from public, anon, authenticated;
revoke all on function public.assign_registration_team_uid() from public, anon, authenticated;

drop trigger if exists registrations_assign_team_uid on public.registrations;
create trigger registrations_assign_team_uid
before insert on public.registrations
for each row execute function public.assign_registration_team_uid();

-- Keep the event editable while preserving a clear, non-payment registration fee.
comment on column public.domains.event_details is 'Event codes, challenge requirements and evaluation criteria are editable JSON managed by administrators.';
