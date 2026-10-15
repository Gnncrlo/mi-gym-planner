-- Run this complete file in the SQL Editor of the app's own Supabase project.
-- It never deletes planner records or authentication users.
begin;

create table if not exists public.planner_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null,
 revision bigint not null default 1,
 updated_at timestamptz not null default clock_timestamp(),
 constraint planner_accounts_state_object check (jsonb_typeof(state) = 'object'),
 constraint planner_accounts_revision_positive check (revision >= 1)
);

-- Re-running this migration preserves all rows. An unrelated table with this
-- name must be reviewed rather than silently cast, emptied, or replaced.
do $migration$
begin
 if not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'planner_accounts'
   and column_name = 'user_id' and udt_name = 'uuid' and is_nullable = 'NO'
 ) or not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'planner_accounts'
   and column_name = 'state' and udt_name = 'jsonb' and is_nullable = 'NO'
 ) or not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'planner_accounts'
   and column_name = 'revision' and udt_name = 'int8' and is_nullable = 'NO'
 ) or not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'planner_accounts'
   and column_name = 'updated_at' and udt_name = 'timestamptz' and is_nullable = 'NO'
 ) then
  raise exception 'planner_accounts has a different schema. Review it before proceeding; existing data has not been replaced.';
 end if;
end;
$migration$;

alter table public.planner_accounts enable row level security;
alter table public.planner_accounts force row level security;

-- Public/publishable API keys cannot access rows without a signed-in user.
-- Signed-in users can read, create and update their own row, but cannot delete.
revoke all on table public.planner_accounts from public, anon, authenticated;
revoke all (user_id, state, revision, updated_at) on table public.planner_accounts from public, anon, authenticated;
grant select, insert, update on table public.planner_accounts to authenticated;

drop policy if exists planner_accounts_owner_guard on public.planner_accounts;
create policy planner_accounts_owner_guard
 on public.planner_accounts as restrictive for all to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);

drop policy if exists planner_accounts_select_own on public.planner_accounts;
create policy planner_accounts_select_own
 on public.planner_accounts for select to authenticated
 using ((select auth.uid()) = user_id);

drop policy if exists planner_accounts_insert_own on public.planner_accounts;
create policy planner_accounts_insert_own
 on public.planner_accounts for insert to authenticated
 with check ((select auth.uid()) = user_id);

drop policy if exists planner_accounts_update_own on public.planner_accounts;
create policy planner_accounts_update_own
 on public.planner_accounts for update to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);

create or replace function public.planner_accounts_version_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $guard$
begin
 if tg_op = 'INSERT' then
  if new.revision is distinct from 1::bigint then
   raise exception using errcode = '23514', message = 'A new planner must start at revision 1.';
  end if;
 else
  if new.user_id is distinct from old.user_id then
   raise exception using errcode = '42501', message = 'The account owner cannot be changed.';
  end if;
  if old.revision = 9223372036854775807::bigint then
   raise exception using errcode = '23514', message = 'The planner revision cannot be increased further.';
  end if;
  if new.revision is distinct from old.revision + 1 then
   raise exception using errcode = '23514', message = 'The planner revision must advance by exactly one.';
  end if;
 end if;
 new.updated_at := clock_timestamp();
 return new;
end;
$guard$;

-- A trigger is invoked by the table, not as a callable frontend RPC.
revoke all on function public.planner_accounts_version_guard() from public, anon, authenticated;
drop trigger if exists planner_accounts_version_guard on public.planner_accounts;
create trigger planner_accounts_version_guard
 before insert or update on public.planner_accounts
 for each row execute function public.planner_accounts_version_guard();

comment on table public.planner_accounts is 'One private planner per authenticated user. Client updates must filter both user_id and the previously read revision.';
comment on column public.planner_accounts.state is 'Complete planner state; local legacy data is copied only with explicit user consent.';
comment on column public.planner_accounts.revision is 'Optimistic concurrency version: INSERT 1; conditional UPDATE previous revision + 1.';

commit;
