-- AVISHKAR 2K26 · Migration 202611100008
-- Align domain-content.ts and database: ensure MECHSPARK minimum_team_size is NULL
-- (the event reference confirms a maximum of 4 but specifies no minimum).
-- Migration 202611100005 already set minimum_team_size=NULL for MECHSPARK;
-- this migration is an idempotent guard to document that intent explicitly.

-- MECHSPARK: maximum 4, no confirmed minimum
update public.domains
set
  minimum_team_size = null,
  maximum_team_size = 4
where slug = 'mechspark';

-- Align the event_details JSON for MECHSPARK challenges:
-- Remove minTeamSize from each challenge object; keep maxTeamSize=4.
-- Only update if the JSON currently embeds erroneous minTeamSize keys.
update public.domains
set event_details = jsonb_set(
  event_details,
  '{challenges}',
  (
    select jsonb_agg(
      challenge - 'minTeamSize'
    )
    from jsonb_array_elements(event_details->'challenges') as challenge
  )
)
where slug = 'mechspark'
  and exists (
    select 1
    from jsonb_array_elements(event_details->'challenges') as ch
    where ch ? 'minTeamSize'
  );

-- Document: official team-size rules as of migration 202611100008
-- Domain                       | Challenge          | Min  | Max
-- ─────────────────────────────────────────────────────────────────
-- AI in Cybersecurity & FinTech | ai-cybersecurity  | TBA  | TBA
-- Full Stack Development        | full-stack         | TBA  | TBA
-- IoT & Embedded Systems        | iot-embedded       | 2    | 4
-- MECHSPARK 2K26                | lathe-machine      | NULL | 4
-- MECHSPARK 2K26                | solid-edge-cad     | NULL | 4
-- MECHSPARK 2K26                | cardboard-model    | NULL | 4
-- CIVILX                        | bridge-x           | 4    | 4
-- CIVILX                        | cadathon           | 2    | 2
-- CIVILX                        | surveyor-x         | 4    | 4

