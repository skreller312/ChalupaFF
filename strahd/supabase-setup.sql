-- Strahdsmas: Supabase setup
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- Before running: replace SET_A_LONG_RANDOM_HOST_CODE with the host password in your local copy only; do not commit the edited SQL file because this repository is public.
create table if not exists public.black_ball_settings (
  id boolean primary key default true check (id = true),
  host_code text not null,
  event_title text not null default 'Strahdsmas',
  updated_at timestamptz not null default now()
);
insert into public.black_ball_settings (id, host_code)
values (true, 'SET_A_LONG_RANDOM_HOST_CODE')
on conflict (id) do update set host_code = excluded.host_code;

create table if not exists public.black_ball_assignments (
  giver text primary key,
  recipient text not null unique,
  created_at timestamptz not null default now(),
  constraint no_self_assignment check (giver <> recipient),
  constraint valid_giver check (giver in ('Ashling','Lana','Strahd','Kaedrin','Zillah','Penelope')),
  constraint valid_recipient check (recipient in ('Ashling','Lana','Strahd','Kaedrin','Zillah','Penelope')),
  constraint ashling_lana_exclusion check (not (giver='Ashling' and recipient='Lana') and not (giver='Lana' and recipient='Ashling')),
  constraint kaedrin_penelope_exclusion check (not (giver='Kaedrin' and recipient='Penelope') and not (giver='Penelope' and recipient='Kaedrin'))
);
alter table public.black_ball_settings enable row level security;
create table if not exists public.black_ball_access_codes (
  participant text primary key check (participant in ('Ashling','Lana','Strahd','Kaedrin','Zillah','Penelope')),
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.black_ball_access_codes enable row level security;
alter table public.black_ball_assignments enable row level security;
-- No direct table reads/writes for anonymous visitors. Only the narrowly scoped RPCs below.
revoke all on public.black_ball_settings from anon, authenticated;
revoke all on public.black_ball_assignments from anon, authenticated;
revoke all on public.black_ball_access_codes from anon, authenticated;

create or replace function public.publish_draw(p_host_code text, p_assignments jsonb, p_event_title text default 'Strahdsmas')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  expected text;
  row_count integer;
  distinct_givers integer;
  distinct_recipients integer;
begin
  select host_code into expected from public.black_ball_settings where id = true;
  if expected is null or p_host_code is distinct from expected then
    raise exception 'Invalid host code';
  end if;
  if jsonb_typeof(p_assignments) <> 'array' then raise exception 'Assignments must be an array'; end if;
  select count(*), count(distinct x.giver), count(distinct x.recipient)
    into row_count, distinct_givers, distinct_recipients
  from jsonb_to_recordset(p_assignments) as x(giver text, recipient text);
  if row_count <> 6 or distinct_givers <> 6 or distinct_recipients <> 6 then
    raise exception 'A complete one-to-one assignment for all six characters is required';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_assignments) as x(giver text, recipient text)
    join jsonb_to_recordset(p_assignments) as y(giver text, recipient text)
      on x.giver = y.recipient and x.recipient = y.giver
  ) then
    raise exception 'Reciprocal assignments are not allowed';
  end if;
  delete from public.black_ball_assignments where true;
  insert into public.black_ball_assignments(giver, recipient)
  select x.giver, x.recipient from jsonb_to_recordset(p_assignments) as x(giver text, recipient text);
  update public.black_ball_settings set event_title = coalesce(nullif(trim(p_event_title),''),'Strahdsmas'), updated_at = now() where id = true;
  return jsonb_build_object('success', true, 'participants', 6);
end; $$;

drop function if exists public.reveal_assignment(text);

create or replace function public.reveal_assignment(p_character text, p_access_code text)
returns table(recipient text, event_title text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  stored_hash text;
  selected_character text;
begin
  selected_character := initcap(trim(p_character));
  select c.password_hash into stored_hash
  from public.black_ball_access_codes c
  where c.participant = selected_character;

  if stored_hash is null or p_access_code is null
     or extensions.crypt(p_access_code, stored_hash) <> stored_hash then
    raise exception 'Invalid character password';
  end if;

  return query
  select a.recipient, s.event_title
  from public.black_ball_assignments a
  cross join public.black_ball_settings s
  where s.id = true and a.giver = selected_character
  limit 1;
end; $$;

revoke all on function public.publish_draw(text,jsonb,text) from public;
revoke all on function public.reveal_assignment(text,text) from public;
grant execute on function public.publish_draw(text,jsonb,text) to anon, authenticated;
grant execute on function public.reveal_assignment(text,text) to anon, authenticated;
