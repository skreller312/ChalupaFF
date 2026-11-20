-- Strahdsmas: Supabase setup
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
alter table public.black_ball_assignments enable row level security;
-- No direct table reads/writes for anonymous visitors. Only the narrowly scoped RPCs below.
revoke all on public.black_ball_settings from anon, authenticated;
revoke all on public.black_ball_assignments from anon, authenticated;

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
  delete from public.black_ball_assignments;
  insert into public.black_ball_assignments(giver, recipient)
  select x.giver, x.recipient from jsonb_to_recordset(p_assignments) as x(giver text, recipient text);
  update public.black_ball_settings set event_title = coalesce(nullif(trim(p_event_title),''),'Strahdsmas'), updated_at = now() where id = true;
  return jsonb_build_object('success', true, 'participants', 6);
end; $$;

create or replace function public.reveal_assignment(p_character text)
returns table(recipient text, event_title text)
language sql security definer set search_path = public as $$
  select a.recipient, s.event_title
  from public.black_ball_assignments a
  cross join public.black_ball_settings s
  where s.id = true and lower(a.giver) = lower(trim(p_character))
  limit 1;
$$;

revoke all on function public.publish_draw(text,jsonb,text) from public;
revoke all on function public.reveal_assignment(text) from public;
grant execute on function public.publish_draw(text,jsonb,text) to anon, authenticated;
grant execute on function public.reveal_assignment(text) to anon, authenticated;
