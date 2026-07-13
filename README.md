# Hood Drop — Plinko · Buy · Hold

Multiplayer Plinko on Robinhood Chain. Every authenticated user gets one ball
drop per minute. The server pre-rolls a provably-fair outcome, broadcasts the
seed via Supabase Realtime, and every viewer sees the same ball trace the same
path into the same slot. The slot's multiplier is applied to a base of **$1**,
and the treasury wallet buys that much of a **Noxa**-launched token on the spot.

**The treasury keeps what it buys. Nothing is burned.** Each drop is a buy —
a green candle on the chart — and the tokens accumulate in the buying wallet.
The UI says "bought", never "burned", because the treasury balance is public on
Blockscout and would contradict any other claim.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind v4** + **Framer Motion** + **canvas-confetti**
- **Supabase** Postgres + Realtime + Row Level Security
- **`viem`** against **Robinhood Chain** (EVM L2, chain `4663`, ETH gas)
- Username login via signed JWT cookie (no password / no wallet required)

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in real values
npx tsx --env-file=.env.local scripts/verify-chain.mts   # preflight, read-only
npm run dev
```

Open <http://localhost:3000>.

## Required env vars

See `.env.example` for the full list. The non-obvious ones:

| Var | Purpose |
| --- | ------- |
| `TREASURY_PRIVATE_KEY` | 32-byte hex key. The wallet that spends WETH and holds the bought tokens. **Keep secret.** |
| `HOOD_TOKEN_ADDRESS` | The Noxa ERC-20 to buy. **No default** — the app refuses to start without it. |
| `RH_RPC_URL` | The public RPC is rate-limited and documented as not production-safe. Use Alchemy / QuickNode / dRPC. |
| `DROP_COST_USD` | Base cost per drop. Multiplied by the slot multiplier. Default `1`. |
| `MAX_USD_PER_DROP` | Hard cap on a single drop's spend. Default `25`. |
| `SWAP_SLIPPAGE_PCT` | Sets `amountOutMinimum`. Default `5`. |
| `DRY_RUN` | `1` simulates every swap instead of sending it. Nothing is spent. |

## Contract addresses

Verified on mainnet — each has bytecode **and** its getters return the expected
values:

| What | Address |
| --- | --- |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| SwapRouter02 | `0xCaf681a66D020601342297493863E78C959E5cb2` |
| Uniswap V3 Factory | `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA` |
| QuoterV2 | `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7` |
| Chainlink ETH/USD | `0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9` |

> **Do not pick these by name on Blockscout.** The chain hosts at least four
> competing Uniswap V3 forks, plus multiple *verified* contracts named
> `SwapRouter`, `Quoter` and `NOXA`. Having bytecode proves nothing. The router
> above was identified by observing that real Noxa swaps route through it, and
> `scripts/verify-chain.mts` re-asserts that the router, quoter and pool all
> agree on one factory and one WETH.

## Database

Migrations live in [`supabase/migrations/`](supabase/migrations).

```bash
supabase db push   # or run each .sql via the SQL editor
```

Schema:

- `users` — `(id, username, created_at, last_drop_at)`.
- `drops` — every drop's lifecycle, including the buy tx hash.
- `config` — single-row runtime tuning (cooldown, drop cost, multipliers, cap).
- `claim_drop(p_user_id, p_cooldown_seconds)` — atomic cooldown check + bump.

## Game logic

- **Board:** 12 rows of pegs ⇒ 13 slots.
- **Multipliers:** `[100, 10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10, 100]`.
- **Outcome:** `sha256(serverSeed || username || nonce)` seeds a Mulberry32 PRNG;
  one bit per row picks left/right; the final slot is the count of right
  deflections.
- **Animation:** the browser receives the seed via Supabase Realtime, derives the
  identical bit string, and animates the ball along a geometric path into the
  correct slot. Same on every machine — no floating-point drift.
- **Cooldown:** 60 seconds per username, enforced atomically by the `claim_drop`
  Postgres RPC. Concurrent requests can't both succeed.

## On-chain buyback

Noxa is **not** a bonding curve. Tokens launch with single-sided liquidity
directly into a Uniswap V3 pool at the **1% fee tier**, paired against WETH. A
buy is therefore an ordinary `exactInputSingle` swap.

For each drop, after the outcome is recorded:

1. Compute `usd_out = drop_cost_usd * multiplier`. Skip on-chain if zero.
2. Refuse if `usd_out > MAX_USD_PER_DROP`.
3. Read Chainlink ETH/USD to size `amountIn`. Reject a stale or out-of-band price.
4. Ask `QuoterV2` for the expected output, then apply `SWAP_SLIPPAGE_PCT` to get
   `amountOutMinimum`. **It is never zero** — a zero minimum is an open
   invitation to sandwich the treasury.
5. Approve the router for WETH **once** (guarded by an `allowance()` read).
6. `multicall(deadline, [exactInputSingle(...)])` — SwapRouter02's
   `exactInputSingle` has no deadline field, so the wrapper supplies one.
7. Decode the `Transfer` event from the receipt to learn exactly how many tokens
   landed in the treasury.
8. Update `drops` with `buy_tx`, `tokens_bought`, and `status='bought'`.

Failures land the row in `status='failed'` with the error in `drops.error`.

## Operations & safety

- **The treasury needs two balances.** WETH funds the swaps; **native ETH pays
  gas**. Underfunding either fails every drop. WETH does not reduce gas costs —
  it's required because the V3 pool is WETH-paired, and holding it avoids
  wrapping on every drop.
- **Noxa anti-snipe will revert your buys.** Swaps revert in the launch block,
  and for roughly the first hour there are max-wallet and per-`tx.origin` caps.
  The treasury is `tx.origin` on *every* drop — exactly what a per-origin cap
  targets. **Don't enable drops until the anti-snipe window has elapsed.**
- **Cap.** `MAX_USD_PER_DROP` is a hard guard. Even a misconfigured multiplier
  table can't bleed the treasury beyond this per drop.
- **The bag grows without bound**, by design. Nothing is sold and nothing is
  burned.
- **Failed drops.** `select * from drops where status='failed' order by created_at desc;`
- **Provably-fair audit.** Each drop stores `server_seed`, `seed_hash`, and
  `slot_index`. Anyone can re-derive the slot using `lib/game/outcome.ts`.

## Out of scope (v1)

- No wallet connection — usernames are public handles only. Rotate `AUTH_SECRET`
  if you suspect leakage.
- No burn. If you later want one, note that Noxa does not document a burn
  mechanism and its tokens are not stated to be `ERC20Burnable` — check the
  specific token's ABI on Blockscout before assuming `burn(uint256)` exists.

## File map

- `app/` — routes (`/`, `/api/login`, `/api/me`, `/api/drop`, `/api/drops`).
- `components/` — `Board`, `DropButton`, `LiveFeed`, `Stats`, `LoginCard`,
  `ThemeBackground`, `HoodBallIcon`, `HoodDropper`, `WinCameo`.
- `lib/game/` — `multipliers.ts`, `outcome.ts` (server), `rng.ts` (browser),
  `physics.ts` (deterministic ball geometry — deliberately not a physics engine).
- `lib/evm/` — `chain.ts`, `treasury.ts`, `abis.ts`, `noxa.ts`, `price.ts`,
  `buyback.ts`, `verify.ts`, `explorer.ts`.
- `lib/hoodFeather.ts` — the feather geometry, single source of truth for the
  canvas sprite, the React icon, and `app/icon.svg`.
- `lib/auth/`, `lib/supabase/`, `supabase/migrations/`.

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run lint    # eslint + react-hooks rules
npx tsx --env-file=.env.local scripts/verify-chain.mts   # read-only preflight
```

## License

Proprietary / unlicensed for now — adapt as you see fit.
