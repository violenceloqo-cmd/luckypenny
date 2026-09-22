# SOL Drop — Solana Plinko · Buy · Burn

Multiplayer Plinko on Solana. Every signed-in user gets one Solana-ball drop per
minute. The server pre-rolls a provably-fair outcome and broadcasts the seed over
Supabase Realtime, so every viewer sees the same ball follow the same path into
the same slot. The slot's multiplier is applied to a base of **0.01 SOL**. The
treasury buys that much of a **pump.fun** token, then **burns every token that
buy delivered, on-chain, right away**.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind v4** + **Framer Motion** + **canvas-confetti**
- **Supabase** Postgres + Realtime + Row Level Security
- **`@solana/web3.js`** + **`@solana/spl-token`**, with buys built by PumpPortal's Local Transaction API
- Username login via a signed JWT cookie (no password, no wallet)

## Quick start

```bash
npm install
cp .env.example .env         # fill in real values; start with DRY_RUN=1
npm run preflight            # read-only: treasury, mint, balances
npm run dev
```

## Required env vars

| Var | Purpose |
| --- | ------- |
| `TREASURY_SECRET_KEY` | Base58 or JSON byte-array keypair. It pays for the buys and signs the burns. **Keep it secret.** |
| `PUMPFUN_TOKEN_MINT` / `NEXT_PUBLIC_PUMPFUN_TOKEN_MINT` | The token to buy and burn. Falls back to the default in `lib/token.ts`. |
| `SOLANA_CLUSTER` / `NEXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta`. pump.fun has no devnet, so buys refuse to run off mainnet unless `DRY_RUN=1`. |
| `SOLANA_RPC_URL` | Use a paid RPC (Helius, Triton, QuickNode). The public RPC rate-limits. |
| `MAX_SOL_PER_DROP` | Hard cap on a single drop. The lower of this and `config.max_sol_per_drop` applies. |
| `PUMP_SLIPPAGE_PCT` / `PUMP_PRIORITY_FEE_SOL` | Buy slippage (default 10) and priority fee (default 0.0005). |
| `BURN_PRIORITY_FEE_SOL` | Total priority fee per burn. Defaults to `PUMP_PRIORITY_FEE_SOL`, so the burn lands as fast as the buy. |
| `DRY_RUN` | `1` simulates each buy and sends nothing. |

## Database

Migrations live in [`supabase/migrations/`](supabase/migrations).

- **Fresh project:** run only `0001` and `0002`. They already create the SOL
  schema. Do **not** run 0003/0004, which fail on it.
- **A database that ran the Robinhood `0003`:** run `0004` to convert it back.

`0004_sol_drop.sql` reverts the Robinhood schema to SOL columns and restores
`burn_sig`. It moves Robinhood-era rows (USD amounts, never burned) into
`drops_hood_archive`, so they aren't shown as SOL burns.

- `users`: `(id, username, created_at, last_drop_at)`
- `drops`: each drop's lifecycle, with `buy_sig`, `burn_sig` and `tokens_burned`
- `config`: a single row (`drop_cost_sol`, `max_sol_per_drop`, cooldown)
- `claim_drop(p_user_id, p_cooldown_seconds)`: atomic cooldown check and bump

## Game logic

- **Board:** 12 rows of pegs, so 13 slots.
- **Multipliers:** `[100, 10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10, 100]`.
- **Outcome:** `sha256(serverSeed:username:nonce)` seeds a Mulberry32 PRNG. Each
  row takes one bit for left or right, and the slot is the number of rights.
- **Animation:** every browser derives the same bits from the seed. When the
  ball lands, it ignites and dissolves into embers above its slot, standing in
  for the burn happening on-chain.

## Buy & burn

For each drop, once the outcome is recorded:

1. `sol_out = drop_cost_sol × multiplier`. Refuse anything over the per-drop cap.
2. Check the treasury covers the buy, the ATA rent and the fees.
3. PumpPortal builds the buy (`pool: "auto"` follows the token onto PumpSwap
   after it graduates). The server signs it and sends it through our RPC.
   Status → **`bought`** ("burning" in the feed).
4. Read **exactly** what that buy delivered from its own pre/post token
   balances. Diffing the live wallet balance would let concurrent drops burn
   each other's tokens.
5. Burn that amount with SPL `BurnChecked`. This lowers the mint's supply and
   shows as a burn on Solscan. An incinerator transfer only hides the tokens.
   Status → **`burned`**, with Solscan links for both transactions.

Buy and burn are two transactions. `BurnChecked` needs an exact amount, and a
pump.fun buy's output is only known after it executes. The burn goes out as soon
as the buy confirms, usually within a couple of seconds.

Both transactions are rebroadcast every 2s until they confirm, and the burn
pays the same priority fee as the buy. If the process dies between the buy and
the burn (timeout, restart), the row stays `bought`. The next drop runs a
reconciler over rows stuck longer than 5 minutes: it records a burn that already
landed on-chain, or burns the tokens now. `npm run reconcile` does the same on
demand.

## Scripts

```bash
npm run preflight                 # read-only health check
npm run buy-burn -- 0.01          # one real buy+burn (simulated if DRY_RUN=1)
npm run reconcile                 # finish drops stuck at "burning"
npm run burn:sweep                # show unburned treasury tokens
npm run burn:sweep -- --yes       # burn them (not while drops are in flight)
```

## File map

- `app/`: routes (`/`, `/api/login`, `/api/me`, `/api/drop`, `/api/drops`)
- `components/`: `Board`, `DropButton`, `LiveFeed`, `Stats`, `LoginCard`,
  `ThemeBackground`, `SolanaBallIcon`, `SolDropper`, `WinCameo`
- `lib/game/`: `multipliers.ts`, `outcome.ts` (server), `rng.ts` (browser), `physics.ts`
- `lib/solana/`: `treasury.ts`, `pumpfun.ts`, `burn.ts`, `buyAndBurn.ts`, `cluster.ts`
- `lib/solBrand.ts`, `lib/solLogo.ts`: ball sprite, burn embers, Solana mark
