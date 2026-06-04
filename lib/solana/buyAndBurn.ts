import { burnTokens, readTokenBalance } from "./burn";
import { pumpfunBuy } from "./pumpfun";
import {
  estimateBuyAndBurnLamports,
  getConnection,
  getMaxSolPerDrop,
  getTokenMint,
  getTreasuryKeypair,
  getTreasurySolBalance,
  isMainnet,
} from "./treasury";

export interface BuyAndBurnInput {
  solAmount: number;
}

export type BuyAndBurnOutcome =
  | {
      ok: true;
      skipped: false;
      buySig: string;
      burnSig: string;
      tokensBurned: bigint;
    }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string; buySig?: string };

function summarizeSolanaError(message: string): string {
  const insufficient = message.match(/insufficient lamports (\d+), need (\d+)/i);
  if (insufficient) {
    const have = Number(insufficient[1]) / 1e9;
    const need = Number(insufficient[2]) / 1e9;
    return `Treasury underfunded: has ${have.toFixed(4)}, needs ${need.toFixed(4)} for this buy`;
  }
  if (message.includes("Attempt to debit an account but found no record of a prior credit")) {
    return "Treasury underfunded: not enough balance for this buy";
  }
  if (message.includes("buy succeeded but token balance did not increase")) {
    return "Buy confirmed but tokens not visible yet — retry or check RPC";
  }
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

async function waitForTokenDelta(
  connection: ReturnType<typeof getConnection>,
  owner: ReturnType<typeof getTreasuryKeypair>["publicKey"],
  mint: ReturnType<typeof getTokenMint>,
  before: bigint,
  maxMs = 30_000,
): Promise<bigint> {
  const start = Date.now();
  let delayMs = 400;
  while (Date.now() - start < maxMs) {
    const after = await readTokenBalance(connection, owner, mint);
    if (after > before) return after - before;
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(Math.round(delayMs * 1.4), 2500);
  }
  return 0n;
}

/**
 * Top-level orchestration: validate, buy on pump.fun, then burn the delta.
 *
 * Off-mainnet we skip real on-chain work because pump.fun doesn't deploy to
 * devnet. We still return a `skipped` result so the drop is marked accordingly
 * and the UI can show "simulated" status.
 */
export async function buyAndBurn(input: BuyAndBurnInput): Promise<BuyAndBurnOutcome> {
  const { solAmount } = input;
  if (!Number.isFinite(solAmount) || solAmount <= 0) {
    return { ok: true, skipped: true, reason: "zero-multiplier" };
  }

  const cap = getMaxSolPerDrop();
  if (solAmount > cap) {
    return {
      ok: false,
      error: `solAmount ${solAmount} exceeds MAX_SOL_PER_DROP ${cap}`,
    };
  }

  if (!isMainnet()) {
    return { ok: false, error: "Buy & burn only runs on Solana mainnet" };
  }

  let treasury;
  let mint;
  let connection;
  try {
    treasury = getTreasuryKeypair();
    mint = getTokenMint();
    connection = getConnection();
  } catch (e) {
    return {
      ok: false,
      error: `treasury/mint not configured: ${(e as Error).message}`,
    };
  }

  const neededLamports = estimateBuyAndBurnLamports(solAmount);
  const treasuryLamports = await connection.getBalance(treasury.publicKey, "confirmed");
  if (treasuryLamports < neededLamports) {
    const have = treasuryLamports / 1e9;
    const need = neededLamports / 1e9;
    return {
      ok: false,
      error: `Treasury underfunded: ${have.toFixed(4)} available, need ~${need.toFixed(4)} for ${solAmount} buy + burn fees`,
    };
  }

  let buySig: string | undefined;
  try {
    const before = await readTokenBalance(connection, treasury.publicKey, mint);

    const buy = await pumpfunBuy(connection, treasury, {
      mint: mint.toBase58(),
      solAmount,
    });
    buySig = buy.signature;

    const delta = await waitForTokenDelta(connection, treasury.publicKey, mint, before);
    if (delta === 0n) {
      return {
        ok: false,
        error: summarizeSolanaError(
          "buy succeeded but token balance did not increase after polling",
        ),
        buySig,
      };
    }

    const burn = await burnTokens(connection, treasury, mint, delta);

    return {
      ok: true,
      skipped: false,
      buySig,
      burnSig: burn.signature,
      tokensBurned: burn.amount,
    };
  } catch (e) {
    const raw = (e as Error).message;
    const treasuryBal = await getTreasurySolBalance(connection, treasury.publicKey).catch(() => null);
    const suffix =
      treasuryBal !== null && treasuryBal < solAmount + 0.002
        ? ` (treasury balance: ${treasuryBal.toFixed(4)})`
        : "";
    return { ok: false, error: summarizeSolanaError(raw) + suffix, buySig };
  }
}
