-- AVISHKAR 2K26 · Migration 202611100009
-- Confirmed rules for Software domains and event logistics:
-- 1. AI in Cybersecurity & FinTech: team size 2-4 members, duration 24 hours.
-- 2. Full Stack Development: team size 2-4 members, duration 24 hours.
-- 3. Registration deadline: 21 November 2026.

update public.domains set
  minimum_team_size = 2,
  maximum_team_size = 4,
  event_details = jsonb_set(
    jsonb_set(
      jsonb_set(
        event_details,
        '{duration}',
        '"24 hours"'::jsonb
      ),
      '{challenges,0,minTeamSize}',
      '2'::jsonb
    ),
    '{challenges,0,maxTeamSize}',
    '4'::jsonb
  )
where slug in ('ai-cybersecurity-fintech', 'full-stack');

update public.domains set
  event_details = jsonb_set(
    event_details,
    '{challenges,0,requirements}',
    '["Teams must have 2 to 4 members.","Duration: 24 hours.","No pre-built complete project.","Disclose external libraries, APIs and AI tools.","Submit source code, README or documentation, and a working demonstration.","Plagiarism and copied submissions are prohibited."]'::jsonb
  )
where slug = 'ai-cybersecurity-fintech';

update public.domains set
  event_details = jsonb_set(
    event_details,
    '{challenges,0,requirements}',
    '["Teams must have 2 to 4 members.","Duration: 24 hours.","No pre-built complete projects.","Disclose APIs, libraries and AI tools.","Submit source code, a working demo and documentation.","Plagiarism is prohibited."]'::jsonb
  )
where slug = 'full-stack';
