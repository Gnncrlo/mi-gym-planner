-- Manual integration test for the SQL Editor, after 001_planner_accounts.sql.
-- Run the WHOLE file. Test-only auth users and planner rows are rolled back.
-- This exercises database permissions/RLS; it does not test email delivery or the app.
begin;

do $fixtures$
declare
 uid_a uuid;
 uid_b uuid;
begin
 -- Never update/upsert an existing auth user or use a real user's identifier.
 loop
  uid_a := gen_random_uuid();
  exit when not exists (select 1 from auth.users where id = uid_a);
 end loop;
 loop
  uid_b := gen_random_uuid();
  exit when uid_b <> uid_a and not exists (select 1 from auth.users where id = uid_b);
 end loop;
 insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
 values
  (uid_a, 'authenticated', 'authenticated', 'mgp-rls-a-' || uid_a::text || '@example.invalid', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  (uid_b, 'authenticated', 'authenticated', 'mgp-rls-b-' || uid_b::text || '@example.invalid', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
 perform set_config('mgp.test_uid_a', uid_a::text, true);
 perform set_config('mgp.test_uid_b', uid_b::text, true);
 perform set_config('mgp.test_started_at', clock_timestamp()::text, true);
end;
$fixtures$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('mgp.test_uid_a'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mgp.test_uid_a'), 'role', 'authenticated')::text, true);

do $user_a_insert$
declare
 rejected boolean := false;
begin
 if auth.uid() is distinct from current_setting('mgp.test_uid_a')::uuid then
  raise exception 'FAIL: test JWT does not identify user A';
 end if;
 begin
  insert into public.planner_accounts (user_id, state, revision)
  values (current_setting('mgp.test_uid_b')::uuid, '{"owner":"A cannot create B"}', 1);
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: A could INSERT B''s planner'; end if;

 rejected := false;
 begin
  insert into public.planner_accounts (user_id, state, revision)
  values (auth.uid(), '{"owner":"A"}', 2);
 exception when check_violation then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: INSERT accepted a revision other than 1'; end if;

 insert into public.planner_accounts (user_id, state, revision, updated_at)
 values (auth.uid(), '{"owner":"A","foodLog":[{"text":"Pan con huevo"}]}', 1, '1999-01-01T00:00:00Z');
 if not exists (
  select 1 from public.planner_accounts
  where user_id = auth.uid() and revision = 1 and state->>'owner' = 'A'
   and updated_at >= current_setting('mgp.test_started_at')::timestamptz
 ) then raise exception 'FAIL: A cannot read its inserted state or server timestamp was not applied'; end if;
end;
$user_a_insert$;

select set_config('request.jwt.claim.sub', current_setting('mgp.test_uid_b'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mgp.test_uid_b'), 'role', 'authenticated')::text, true);
insert into public.planner_accounts (user_id, state, revision)
values (auth.uid(), '{"owner":"B","body":[{"kg":70}]}', 1);

select set_config('request.jwt.claim.sub', current_setting('mgp.test_uid_a'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mgp.test_uid_a'), 'role', 'authenticated')::text, true);

do $user_a_update$
declare
 affected bigint;
 rejected boolean := false;
begin
 if (select count(*) from public.planner_accounts) <> 1
    or exists (select 1 from public.planner_accounts where user_id = current_setting('mgp.test_uid_b')::uuid) then
  raise exception 'FAIL: A can SELECT another account';
 end if;
 update public.planner_accounts set state = '{"owner":"wrong"}', revision = 2
 where user_id = current_setting('mgp.test_uid_b')::uuid and revision = 1;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'FAIL: A could UPDATE B''s planner'; end if;

 begin
  update public.planner_accounts set user_id = current_setting('mgp.test_uid_b')::uuid, revision = 2
  where user_id = auth.uid() and revision = 1;
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: UPDATE could transfer a planner to another user'; end if;

 -- Successful compare-and-swap: a state read at revision 1 becomes revision 2.
 update public.planner_accounts
 set state = '{"owner":"A","foodLog":[{"text":"Pan con huevo y tomate"}]}', revision = 2,
  updated_at = '1999-01-01T00:00:00Z'
 where user_id = auth.uid() and revision = 1;
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'FAIL: valid own-row CAS did not update exactly once'; end if;

 -- A stale device still expecting revision 1 must not overwrite revision 2.
 update public.planner_accounts set state = '{"owner":"stale"}', revision = 2
 where user_id = auth.uid() and revision = 1;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'FAIL: stale CAS overwrote newer state'; end if;
 if not exists (
  select 1 from public.planner_accounts where user_id = auth.uid() and revision = 2
   and state->>'owner' = 'A'
   and state->'foodLog'->0->>'text' = 'Pan con huevo y tomate'
   and updated_at >= current_setting('mgp.test_started_at')::timestamptz
 ) then raise exception 'FAIL: state/revision/timestamp changed after stale CAS'; end if;

 rejected := false;
 begin
  update public.planner_accounts set state = '{"owner":"bad revision"}', revision = 99
  where user_id = auth.uid() and revision = 2;
 exception when check_violation then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: revision skipping was allowed'; end if;

 rejected := false;
 begin
  update public.planner_accounts set state = '[]'::jsonb, revision = 3
  where user_id = auth.uid() and revision = 2;
 exception when check_violation then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: non-object planner state was accepted'; end if;

 rejected := false;
 begin
  delete from public.planner_accounts where user_id = auth.uid();
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: authenticated received DELETE permission'; end if;
end;
$user_a_update$;

select set_config('request.jwt.claim.sub', current_setting('mgp.test_uid_b'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mgp.test_uid_b'), 'role', 'authenticated')::text, true);

do $user_b_isolation$
declare affected bigint;
begin
 if (select count(*) from public.planner_accounts) <> 1
    or exists (select 1 from public.planner_accounts where user_id = current_setting('mgp.test_uid_a')::uuid)
    or not exists (select 1 from public.planner_accounts where user_id = auth.uid() and revision = 1 and state->>'owner' = 'B') then
  raise exception 'FAIL: B can read A or B''s original state was modified';
 end if;
 update public.planner_accounts set state = '{"owner":"B","body":[{"kg":69.5}]}', revision = 2
 where user_id = auth.uid() and revision = 1;
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'FAIL: B cannot update its own planner'; end if;
end;
$user_b_isolation$;

-- Having the authenticated database role without a user claim grants no rows.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
do $missing_identity$
declare rejected boolean := false;
begin
 if exists (select 1 from public.planner_accounts) then raise exception 'FAIL: missing JWT identity can read planners'; end if;
 begin
  insert into public.planner_accounts (user_id, state, revision)
  values (current_setting('mgp.test_uid_a')::uuid, '{}', 1);
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'FAIL: missing JWT identity can create a planner'; end if;
end;
$missing_identity$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $anonymous_permissions$
declare
 statement text;
 rejected boolean;
begin
 foreach statement in array array[
  'select * from public.planner_accounts',
  'insert into public.planner_accounts (user_id, state, revision) values (current_setting(''mgp.test_uid_a'')::uuid, ''{}'', 1)',
  'update public.planner_accounts set state = ''{}'', revision = 3 where user_id = current_setting(''mgp.test_uid_a'')::uuid',
  'delete from public.planner_accounts where user_id = current_setting(''mgp.test_uid_a'')::uuid'
 ] loop
  rejected := false;
  begin execute statement;
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: anonymous permission was granted: %', statement; end if;
 end loop;
end;
$anonymous_permissions$;

reset role;
do $final_integrity$
begin
 if not exists (select 1 from public.planner_accounts where user_id = current_setting('mgp.test_uid_a')::uuid and revision = 2 and state->>'owner' = 'A')
    or not exists (select 1 from public.planner_accounts where user_id = current_setting('mgp.test_uid_b')::uuid and revision = 2 and state->'body'->0->>'kg' = '69.5') then
  raise exception 'FAIL: final fixture integrity';
 end if;
end;
$final_integrity$;

select 'PASS: own-row access, cross-account isolation, anonymous denial, revision guards and stale CAS. All fixtures will now be rolled back.' as result;
rollback;
