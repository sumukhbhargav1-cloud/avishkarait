-- Keep accommodation requests simple while making the requester phone visible
-- in admin cards. Backfill it from the team's existing leader contact.
alter table public.accommodation_requests
  add column participant_phone text;

update public.accommodation_requests request
set participant_phone = registration.team_leader_phone
from public.registrations registration
where registration.id = request.registration_id;

alter table public.accommodation_requests
  add constraint accommodation_request_phone_check
  check (participant_phone is null or participant_phone ~ '^\+?[0-9(). -]{7,20}$');
