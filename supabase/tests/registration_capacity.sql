-- Integration check for the atomic registration capacity RPC.
-- Run after both migrations against the portal project's test database.
-- Every row is rolled back at the end.
begin;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  i integer;
  id uuid;
  blocked boolean := false;
  duplicate_blocked boolean := false;
  saved_count bigint;
  remaining integer;
  new_registration_id uuid;
begin
  for i in 1..2 loop
    id := gen_random_uuid();
    select result.registered_teams, result.remaining_slots
      into saved_count, remaining
      from public.submit_registration(
        id,
        'test-capacity-domain',
        'Capacity Test Domain',
        'test-challenge',
        2,
        1,
        1,
        'Team ' || i,
        1,
        'Capacity Leader ' || i,
        i || '.leader@example.test',
        '+91 90000 0000' || i,
        '[]'::jsonb,
        'TESTUTR000000' || i,
        id::text || '/payment-proof.png'
      ) as result;
    if saved_count <> i or remaining <> 2 - i then
      raise exception 'Unexpected count after registration %: count %, remaining %', i, saved_count, remaining;
    end if;
  end loop;

  begin
    id := gen_random_uuid();
    select registration_id into new_registration_id
      from public.submit_registration(
        id,
        'test-capacity-domain',
        'Capacity Test Domain',
        'test-challenge',
        2,
        1,
        1,
        'Team 3',
        1,
        'Capacity Leader 3',
        '3.leader@example.test',
        '+91 90000 00003',
        '[]'::jsonb,
        'TESTUTR0000003',
        id::text || '/payment-proof.png'
      );
  exception when sqlstate 'P0001' then
    blocked := true;
  end;

  if not blocked then raise exception 'Capacity check accepted a registration beyond the limit.'; end if;

  -- Same-domain member email reuse is rejected even when the capacity is not full.
  id := gen_random_uuid();
  perform public.submit_registration(
    id, 'test-duplicate-domain', 'Duplicate Test Domain', 'test-challenge', 4, 1, 2,
    'First team', 2, 'First Leader', 'first.leader@example.test', '+91 90000 00011',
    '[{"fullName":"Shared Member","email":"shared.member@example.test","phone":"+91 90000 00012"}]'::jsonb,
    'DUPUTR000001', id::text || '/payment-proof.png'
  );
  begin
    id := gen_random_uuid();
    perform public.submit_registration(
      id, 'test-duplicate-domain', 'Duplicate Test Domain', 'test-challenge', 4, 1, 2,
      'Second team', 2, 'Second Leader', 'second.leader@example.test', '+91 90000 00013',
      '[{"fullName":"Shared Member","email":"shared.member@example.test","phone":"+91 90000 00012"}]'::jsonb,
      'DUPUTR000002', id::text || '/payment-proof.png'
    );
  exception when sqlstate '23505' then
    duplicate_blocked := true;
  end;
  if not duplicate_blocked then raise exception 'Duplicate member email was accepted.'; end if;
end;
$$;

rollback;
