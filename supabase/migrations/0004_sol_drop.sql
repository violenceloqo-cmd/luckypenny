-- ─────────────────────────────────────────────────────────────────────────────
-- SOL Drop: migrate from Robinhood Chain buy-&-hold back to Solana buy-&-burn.
--
-- ONLY for a database that ran 0003. A fresh project gets the SOL schema from
-- 0001 + 0002 alone; this file errors there (no usd_* columns).
--
-- Semantic changes, not just renames:
--   1. Amounts are denominated in SOL again, not USD.
--   2. Every drop buys on pump.fun and burns what it bought, so the burn
--      signature returns and `tokens_bought` becomes `tokens_burned`.
--   3. Status 'bought' now means "buy landed, burn in flight" and 'burned' is
--      the terminal success state.
--
-- 0003 renamed sol_* → usd_* without converting values, so rows from the
-- original Solana era still hold SOL amounts and come back correct. Rows from
-- the Robinhood era hold USD amounts and never burned anything; they are moved
-- to `drops_hood_archive` rather than being shown as SOL burns.
-- ─────────────────────────────────────────────────────────────────────────────

-- archive Robinhood-era drops ---------------------------------------------
-- An EVM tx hash (0x…) marks a Robinhood drop for certain; the date catches its
-- pending/failed/skipped rows that never got one (Hood Drop shipped 2026-07-13).
create table if not exists public.drops_hood_archive as
select id, user_id, username, server_seed, client_nonce, seed_hash, slot_index,
       multiplier, usd_in, usd_out, status::text as status, buy_tx, tokens_bought,
       error, created_at, updated_at
  from public.drops
 where false;

insert into public.drops_hood_archive
select id, user_id, username, server_seed, client_nonce, seed_hash, slot_index,
       multiplier, usd_in, usd_out, status::text, buy_tx, tokens_bought,
       error, created_at, updated_at
  from public.drops
 where buy_tx like '0x%'
    or created_at >= timestamptz '2026-07-13 00:00:00+00';

delete from public.drops d
 using public.drops_hood_archive a
 where a.id = d.id;

-- Service-role only: RLS on with no policies hides it from the anon key.
alter table public.drops_hood_archive enable row level security;

-- config -----------------------------------------------------------------
alter table public.config rename column drop_cost_usd    to drop_cost_sol;
alter table public.config rename column max_usd_per_drop to max_sol_per_drop;

alter table public.config alter column drop_cost_sol    set default 0.01;
alter table public.config alter column max_sol_per_drop set default 1;

-- The single row holds USD values; reset to SOL. 100x at 0.01 = 1 SOL = the cap.
update public.config set drop_cost_sol = 0.01, max_sol_per_drop = 1 where id = 1;

-- drops: columns ----------------------------------------------------------
alter table public.drops rename column usd_in        to sol_in;
alter table public.drops rename column usd_out       to sol_out;
alter table public.drops rename column buy_tx        to buy_sig;
alter table public.drops rename column tokens_bought to tokens_burned;

-- 0003 dropped this; Solana-era burn signatures are gone, new drops refill it.
alter table public.drops add column if not exists burn_sig text;

-- drops: status enum ------------------------------------------------------
-- Every 'bought' row left after archiving is a Solana-era drop that 0003
-- relabelled from 'burned'; give it back its real status while swapping in an
-- enum that has both values.
alter table public.drops alter column status drop default;

create type drop_status_new as enum ('pending', 'bought', 'burned', 'failed', 'skipped');

alter table public.drops
  alter column status type drop_status_new
  using (case when status::text = 'bought' then 'burned' else status::text end)::drop_status_new;

alter table public.drops alter column status set default 'pending';

drop type drop_status;
alter type drop_status_new rename to drop_status;
