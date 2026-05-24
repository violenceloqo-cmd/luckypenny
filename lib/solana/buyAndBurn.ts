import { burnTokens, readTokenBalance } from "./burn";
import { pumpfunBuy } from "./pumpfun";
import {
  getConnection,
  getMaxSolPerDrop,
  getTokenMint,
  getTreasuryKeypair,
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
    return { ok: true, skipped: true, reason: "non-mainnet cluster" };
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

  let buySig: string | undefined;
  try {
    const before = await readTokenBalance(connection, treasury.publicKey, mint);

    const buy = await pumpfunBuy(connection, treasury, {
      mint: mint.toBase58(),
      solAmount,
    });
    buySig = buy.signature;

    // Give the RPC a moment to reflect the new ATA balance.
    await new Promise((r) => setTimeout(r, 1500));
    const after = await readTokenBalance(connection, treasury.publicKey, mint);
    const delta = after > before ? after - before : 0n;

    if (delta === 0n) {
      return {
        ok: false,
        error: "buy succeeded but token balance did not increase (RPC lag?)",
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
    return { ok: false, error: (e as Error).message, buySig };
  }
}
