-- ─────────────────────────────────────────────────────────────────────────────
-- Hood Drop: migrate from Solana buy-&-burn to Robinhood Chain buy-&-hold.
--
-- Two semantic changes, not just renames:
--   1. Amounts are denominated in USD, not SOL.
--   2. Nothing is burned. Each drop swaps WETH for the token and the treasury
--      keeps it, so `burn_sig` disappears and `tokens_burned` becomes
--      `tokens_bought`. Status 'burned' becomes 'bought'.
-- ─────────────────────────────────────────────────────────────────────────────

-- config -----------------------------------------------------------------
alter table public.config rename column drop_cost_sol    to drop_cost_usd;
alter table public.config rename column max_sol_per_drop to max_usd_per_drop;

alter table public.config alter column drop_cost_usd    set default 1;
alter table public.config alter column max_usd_per_drop set default 25;

-- The existing single row still holds SOL-denominated values; reset to USD.
update public.config set drop_cost_usd = 1, max_usd_per_drop = 25 where id = 1;

-- drops: columns ----------------------------------------------------------
alter table public.drops rename column sol_in        to usd_in;
alter table public.drops rename column sol_out       to usd_out;
alter table public.drops rename column buy_sig       to buy_tx;
alter table public.drops rename column tokens_burned to tokens_bought;

alter table public.drops drop column if exists burn_sig;

-- drops: status enum ------------------------------------------------------
-- `status` is the enum type `drop_status`, which already carries 'bought'
-- (left over from an earlier rebrand). Retire 'burned': rewrite the rows, then
-- swap the type, since Postgres cannot drop a value from an enum in place.
update public.drops set status = 'bought' where status = 'burned';

alter table public.drops alter column status drop default;

create type drop_status_new as enum ('pending', 'bought', 'failed', 'skipped');

alter table public.drops
  alter column status type drop_status_new
  using status::text::drop_status_new;

alter table public.drops alter column status set default 'pending';

drop type drop_status;
alter type drop_status_new rename to drop_status;
