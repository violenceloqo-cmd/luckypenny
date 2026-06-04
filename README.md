# Lucky Penny Day — Plinko · Buy · Burn

Multiplayer Plinko on a lush Irish meadow. Every authenticated user gets one
penny drop per minute. The server pre-rolls a provably-fair outcome, broadcasts
the seed via Supabase Realtime, and every viewer sees the same ball trace the
same path into the same slot. The slot's multiplier is then applied to a base
of **0.01 SOL**, and the treasury wallet buys & instantly burns that many SOL
worth of a configured **pump.fun** token.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind v4** + **Framer Motion** + **canvas-confetti**
- **Supabase** Postgres + Realtime + Row Level Security
- **`@solana/web3.js`** + **`@solana/spl-token`** + **PumpPortal Local TX API**
- Username login via signed JWT cookie (no password / no wallet required)

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

Open <http://localhost:3000>.

## Required env vars

See `.env.example` for the full list. The non-obvious ones:

| Var | Purpose |
| --- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key — used by the browser and by read-only server routes. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Bypasses RLS so the drop route can insert rows. Get this from `Supabase Dashboard → Project Settings → API`. |
| `AUTH_SECRET` | 32+ random bytes used to sign the session JWT cookie. Generate with `openssl rand -hex 32`. |
| `TREASURY_SECRET_KEY` | Base58-encoded Solana keypair (or JSON-array `[1,2,...]`). The wallet that signs every pump.fun buy and burn. **Keep secret.** |
| `PUMPFUN_TOKEN_MINT` | The mint address of the token to buy & burn. |
| `SOLANA_RPC_URL` | RPC endpoint — use Helius/Triton/QuickNode on mainnet for reliability. |
| `SOLANA_CLUSTER` / `NEXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta` or `devnet`. Devnet skips real buys (records as `skipped`). Must match. |
| `MAX_SOL_PER_DROP` | Safety cap. The route refuses any drop whose `sol_out` exceeds this many SOL. Default `1`. |
| `PUMP_SLIPPAGE_PCT` | Buy slippage tolerance percent. Default `10`. |
| `PUMP_PRIORITY_FEE_SOL` | Compute-budget priority fee in SOL. Default `0.0005`. |

## Database

Migrations live in [`supabase/migrations/`](supabase/migrations). They were
applied to the bound Supabase project via the Supabase MCP at scaffold time.
To re-apply manually:

```bash
supabase db push   # or run each .sql via the SQL editor
```

Schema:

- `users` — `(id, username, created_at, last_drop_at)`.
- `drops` — every drop's full lifecycle, including pump.fun tx signatures.
- `config` — single-row runtime tuning (cooldown, drop cost, multipliers, cap).
- `claim_drop(p_user_id, p_cooldown_seconds)` — atomic cooldown check + bump.

## Game logic

- **Board:** 12 rows of pegs ⇒ 13 slots.
- **Multipliers** (lucky-themed):
  `[100, 10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10, 100]`.
- **Outcome:** `sha256(serverSeed || username || nonce)` seeds a Mulberry32 PRNG;
  one bit per row picks left/right; the final slot is the count of right
  deflections.
- **Animation:** browser receives the seed via Supabase Realtime, derives the
  identical bit string, and animates the ball along a geometric path that lands
  in the correct slot. Same on every machine — no floating-point drift.
- **Cooldown:** 60 seconds per username, enforced atomically by the
  `claim_drop` Postgres RPC. Multiple concurrent requests can't both succeed.

## On-chain buy & burn

For each drop, after the outcome is recorded:

1. Compute `sol_out = drop_cost * multiplier`. Skip on-chain if zero.
2. Refuse if `sol_out > MAX_SOL_PER_DROP`.
3. Off-mainnet (`SOLANA_CLUSTER=devnet`): record as `skipped` and stop. (pump.fun
   has no devnet deployment.)
4. Mainnet: POST to `https://pumpportal.fun/api/trade-local`, get the serialized
   transaction, sign with `TREASURY_SECRET_KEY`, submit, and confirm.
5. Read the treasury's ATA balance delta and burn that many tokens with the SPL
   Token program's `BurnChecked` instruction (permanent supply reduction, visible
   on Solscan as a burn — not a transfer to the incinerator dead address).
6. Update `drops` with `buy_sig`, `burn_sig`, `tokens_burned`, and `status='burned'`.

Failures land the row in `status='failed'` with the error in `drops.error`. The
buy is idempotent: if `buy_sig` is set already, we skip retrying.

## Operations & safety

- **Treasury funding.** Keep enough SOL in the treasury for both the buy itself
  and gas (~0.0005 SOL per drop in priority fee + tx fee).
- **Cap.** `MAX_SOL_PER_DROP` is a hard guard. Even a misconfigured multiplier
  table can't bleed the treasury beyond this per drop.
- **Drain rate.** With 13 slots and uniform random walk, the average payout is
  `0.01 * average(multipliers)`. With these multipliers (mean ≈ 8.66, but very
  long-tailed) — every 100x or 10x outcome is meaningful. Tune
  `config.multipliers` from the DB without redeploying.
- **Failed drops.** Query
  `select * from drops where status='failed' order by created_at desc;` and
  inspect `error`. Re-buy + burn manually if needed.
- **Provably-fair audit.** Each drop stores `server_seed`, `seed_hash`, and
  `slot_index`. Anyone can re-derive the slot from the seed using
  `lib/game/outcome.ts`.

## Out of scope (v1)

- No wallet connection — usernames are public handles only. A username is
  first-come-first-served and can in principle be spoofed by guessing the
  cookie secret; rotate `AUTH_SECRET` if you suspect leakage.
- No automated mainnet test. Manually verify on devnet (simulated buys), then
  flip `SOLANA_CLUSTER` to `mainnet-beta` for production.
- No password reset / no email — discard the session cookie to "log out".

## File map

- `app/` — Next.js routes (`/`, `/api/login`, `/api/me`, `/api/drop`, `/api/drops`).
- `components/` — UI: `Board`, `DropButton`, `LiveFeed`, `Stats`, `LoginCard`,
  `ThemeBackground`, `LeprechaunCameo`.
- `lib/game/` — `multipliers.ts`, `outcome.ts` (server), `rng.ts` (browser),
  `physics.ts` (deterministic ball geometry).
- `lib/solana/` — `treasury.ts`, `pumpfun.ts`, `burn.ts`, `buyAndBurn.ts`.
- `lib/auth/` — `session.ts` (JWT cookie), `username.ts` (validation).
- `lib/supabase/` — `server.ts` (admin + reader), `client.ts` (browser).
- `supabase/migrations/` — SQL migrations.

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run lint    # eslint + react-hooks rules
```

## License

Proprietary / unlicensed for now — adapt as you see fit.
