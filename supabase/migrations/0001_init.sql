-- Lucky Penny Plinko: initial schema
-- Tables: users, drops, config
-- Realtime is enabled for `drops` so the live feed updates everywhere.

create extension if not exists "citext";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- users: username-only auth (display handles), one row per username
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  username      citext unique not null,
  created_at    timestamptz not null default now(),
  last_drop_at  timestamptz
);

create index if not exists users_last_drop_at_idx on public.users (last_drop_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- drops: every ball drop, server-authoritative outcome + on-chain status
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type drop_status as enum ('pending', 'bought', 'burned', 'failed', 'skipped');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.drops (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  username       citext not null,
  server_seed    text not null,
  client_nonce   bigint not null,
  seed_hash      text not null,
  slot_index     int  not null,
  multiplier     numeric(10,4) not null,
  sol_in         numeric(20,9) not null,
  sol_out        numeric(20,9) not null,
  status         drop_status not null default 'pending',
  buy_sig        text,
  burn_sig       text,
  tokens_burned  numeric(40,0),
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists drops_created_at_idx on public.drops (created_at desc);
create index if not exists drops_user_id_idx    on public.drops (user_id);
create index if not exists drops_status_idx     on public.drops (status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists drops_touch_updated_at on public.drops;
create trigger drops_touch_updated_at
before update on public.drops
for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- config: single-row runtime configuration
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.config (
  id                 int primary key default 1,
  token_mint         text,
  multipliers        jsonb  not null default '[100, 10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10, 100]'::jsonb,
  drop_cost_sol      numeric(20,9) not null default 0.01,
  cooldown_seconds   int    not null default 60,
  max_sol_per_drop   numeric(20,9) not null default 1,
  constraint config_single_row check (id = 1)
);

insert into public.config (id) values (1)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security: public can read drops/config/users (for live feed +
-- username availability). Writes go through service-role only.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users  enable row level security;
alter table public.drops  enable row level security;
alter table public.config enable row level security;

drop policy if exists users_select_all  on public.users;
drop policy if exists drops_select_all  on public.drops;
drop policy if exists config_select_all on public.config;

create policy users_select_all  on public.users  for select using (true);
create policy drops_select_all  on public.drops  for select using (true);
create policy config_select_all on public.config for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: publish drops table so clients can subscribe
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.drops;
