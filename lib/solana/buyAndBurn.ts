import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { burnTokens, readTokenBalance, tokenDeltaFromTx } from "./burn";
import { buildPumpfunBuy, sendPumpfunBuy, simulatePumpfunBuy } from "./pumpfun";
import {
  estimateBuyAndBurnLamports,
  getConnection,
  getMaxSolPerDrop,
  getTokenMint,
  getTreasuryKeypair,
  isDryRun,
  isMainnet,
} from "./treasury";

export interface BuyAndBurnInput {
  solAmount: number;
  /** Extra per-drop cap from `config.max_sol_per_drop`; the lower of it and MAX_SOL_PER_DROP wins. */
  maxSol?: number;
  /** Fires once the buy lands, before the burn is sent — lets the feed show "burning". */
  onBought?: (buySig: string) => Promise<void> | void;
}

export type BuyAndBurnOutcome =
  | { ok: true; skipped: false; buySig: string; burnSig: string; tokensBurned: bigint }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string; buySig?: string };

/** Each attempt gets a fresh blockhash; bounded so a live drop never outlives the reconcile window. */
const BURN_ATTEMPTS = 2;

/** Turn RPC/program dumps into something an operator can act on. */
export function summarizeSolanaError(message: string): string {
  const insufficient = message.match(/insufficient lamports (\d+), need (\d+)/i);
  if (insufficient) {
    const have = Number(insufficient[1]) / LAMPORTS_PER_SOL;
    const need = Number(insufficient[2]) / LAMPORTS_PER_SOL;
    return `Treasury underfunded: has ${have.toFixed(4)} SOL, needs ${need.toFixed(4)} for this buy`;
  }
  if (message.includes("Attempt to debit an account but found no record of a prior credit")) {
    return "Treasury underfunded: not enough SOL for this buy";
  }
  if (/slippage|TooMuchSolRequired|TooLittleSolReceived/i.test(message)) {
    return "pump.fun slippage exceeded — price moved past PUMP_SLIPPAGE_PCT";
  }
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

/** Only an expired blockhash guarantees the previous burn attempt never landed. */
function isRetryableBurnError(message: string): boolean {
  return /block height exceeded|blockhash not found/i.test(message);
}

/**
 * Buy `solAmount` of the token on pump.fun, then immediately burn exactly what
 * that buy delivered. The burned amount is read from the buy transaction itself,
 * so concurrent drops never burn each other's tokens.
 *
 * Buy and burn are two transactions: BurnChecked needs an exact amount, and a
 * pump.fun buy's output is only known once it executes.
 */
export async function buyAndBurn(input: BuyAndBurnInput): Promise<BuyAndBurnOutcome> {
  const { solAmount, onBought } = input;
  if (!Number.isFinite(solAmount) || solAmount <= 0) {
    return { ok: true, skipped: true, reason: "zero-multiplier" };
  }

  const cap = Math.min(getMaxSolPerDrop(), input.maxSol ?? Infinity);
  if (solAmount > cap) {
    return { ok: false, error: `solAmount ${solAmount} exceeds the per-drop cap of ${cap} SOL` };
  }

  if (!isMainnet() && !isDryRun()) {
    // pump.fun has no devnet deployment, so there is nothing real to buy there.
    return { ok: false, error: "Buy & burn only runs on Solana mainnet (or with DRY_RUN=1)" };
  }

  let treasury;
  let mint;
  let connection;
  try {
    treasury = getTreasuryKeypair();
    mint = getTokenMint();
    connection = getConnection();
  } catch (e) {
    return { ok: false, error: `treasury/mint not configured: ${(e as Error).message}` };
  }

  const neededLamports = estimateBuyAndBurnLamports(solAmount);
  const treasuryLamports = await connection.getBalance(treasury.publicKey, "confirmed");
  if (treasuryLamports < neededLamports) {
    return {
      ok: false,
      error: `Treasury underfunded: ${(treasuryLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL available, need ~${(
        neededLamports / LAMPORTS_PER_SOL
      ).toFixed(4)} for a ${solAmount} SOL buy + burn fees`,
    };
  }

  let buySig: string | undefined;
  try {
    const before = await readTokenBalance(connection, treasury.publicKey, mint);
    const buyTx = await buildPumpfunBuy(treasury, { mint: mint.toBase58(), solAmount });

    if (isDryRun()) {
      await simulatePumpfunBuy(connection, buyTx);
      return {
        ok: true,
        skipped: true,
        reason: `dry-run: buy of ${solAmount} SOL simulated OK; would burn the tokens it delivers`,
      };
    }

    buySig = await sendPumpfunBuy(connection, buyTx);
    await onBought?.(buySig);

    let delta = await tokenDeltaFromTx(connection, buySig, treasury.publicKey, mint);
    if (delta === null) {
      // RPC hasn't indexed the tx; fall back to the balance diff. Slightly racy
      // under concurrent drops, but strictly better than leaving tokens unburned.
      delta = (await readTokenBalance(connection, treasury.publicKey, mint)) - before;
    }
    if (delta <= 0n) {
      return { ok: false, error: "Buy confirmed but it delivered no tokens to burn", buySig };
    }

    let lastError = "";
    for (let attempt = 1; attempt <= BURN_ATTEMPTS; attempt++) {
      try {
        const burn = await burnTokens(connection, treasury, mint, delta);
        return { ok: true, skipped: false, buySig, burnSig: burn.signature, tokensBurned: burn.amount };
      } catch (e) {
        lastError = (e as Error).message;
        if (!isRetryableBurnError(lastError)) break;
      }
    }
    return {
      ok: false,
      error: `Bought but burn failed: ${summarizeSolanaError(lastError)} — left for the reconciler to burn`,
      buySig,
    };
  } catch (e) {
    return { ok: false, error: summarizeSolanaError((e as Error).message), buySig };
  }
}
