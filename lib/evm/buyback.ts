import { formatEther, type Hash } from "viem";

import { getMaxUsdPerDrop, isDryRun, isMainnet } from "./chain";
import {
  applySlippage,
  ensureRouterAllowance,
  getRouterAllowance,
  quoteWethToToken,
  simulateSwap,
  swapWethForToken,
} from "./noxa";
import { usdToWei } from "./price";
import {
  getPublicClient,
  getTreasuryAccount,
  getTreasuryEthBalance,
  getTreasuryWethBalance,
} from "./treasury";

export interface BuybackInput {
  usdAmount: number;
}

export type BuybackOutcome =
  | { ok: true; skipped: false; buyTx: Hash; tokensBought: bigint }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string; buyTx?: Hash };

/** Rough gas headroom for approve + swap, so we fail early instead of mid-flight. */
const GAS_BUFFER_WEI = 2_000_000_000_000_000n; // 0.002 ETH

/** Turn viem's wall-of-text revert dumps into something an operator can act on. */
export function summarizeEvmError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("insufficient funds")) {
    return "Treasury underfunded: not enough native ETH for gas";
  }
  if (m.includes("stf")) {
    return "WETH transferFrom failed — router allowance missing or WETH balance too low";
  }
  if (m.includes("too little received") || m.includes("amountoutminimum")) {
    return "Swap slippage exceeded — price moved past SWAP_SLIPPAGE_PCT, retry";
  }
  if (m.includes("transaction too old") || m.includes("deadline")) {
    return "Swap deadline expired before it was mined — RPC or chain congestion";
  }
  if (m.includes("max wallet") || m.includes("tx.origin") || m.includes("anti-snipe")) {
    return "Rejected by the token's anti-snipe limits (max-wallet / per-origin cap). Wait out the launch window.";
  }
  if (m.includes("liquidity")) {
    return "Pool has insufficient liquidity for this trade size";
  }
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

/**
 * Buy `usdAmount` of the Hood token with WETH and keep it in the treasury.
 *
 * Nothing is destroyed: the tokens accumulate in the buying wallet. The UI must
 * not claim otherwise — the treasury balance is public on Blockscout.
 */
export async function buyback(input: BuybackInput): Promise<BuybackOutcome> {
  const { usdAmount } = input;

  if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
    return { ok: true, skipped: true, reason: "zero-multiplier" };
  }

  const cap = getMaxUsdPerDrop();
  if (usdAmount > cap) {
    return { ok: false, error: `usdAmount ${usdAmount} exceeds MAX_USD_PER_DROP ${cap}` };
  }

  if (!isMainnet() && !isDryRun()) {
    return { ok: false, error: "Buyback only runs on Robinhood Chain mainnet (or with DRY_RUN=1)" };
  }

  let amountInWei: bigint;
  let amountOutMinimum: bigint;
  try {
    getTreasuryAccount();
    amountInWei = await usdToWei(usdAmount);
    const quoted = await quoteWethToToken(amountInWei);
    amountOutMinimum = applySlippage(quoted);
  } catch (e) {
    return { ok: false, error: `preflight failed: ${summarizeEvmError((e as Error).message)}` };
  }

  // The treasury needs BOTH balances: WETH funds the swap, native ETH pays gas.
  const [weth, eth] = await Promise.all([getTreasuryWethBalance(), getTreasuryEthBalance()]);
  if (weth < amountInWei) {
    return {
      ok: false,
      error: `Treasury underfunded: ${formatEther(weth)} WETH available, need ${formatEther(amountInWei)}`,
    };
  }
  if (eth < GAS_BUFFER_WEI) {
    return {
      ok: false,
      error: `Treasury underfunded: ${formatEther(eth)} native ETH for gas, need ~${formatEther(GAS_BUFFER_WEI)}`,
    };
  }

  if (isDryRun()) {
    // The swap can only be simulated once the router may pull our WETH. On a
    // treasury that has never approved, simulating anyway reverts with `STF`,
    // which reads as "the swap is broken" when in truth the real path would
    // simply approve first. Say what would happen instead of faking a failure.
    if ((await getRouterAllowance()) < amountInWei) {
      return {
        ok: true,
        skipped: true,
        reason:
          `dry-run: would approve the router for WETH, then swap ` +
          `${formatEther(amountInWei)} WETH for >= ${amountOutMinimum} raw tokens ` +
          `(swap not simulated — simulation needs the allowance to exist)`,
      };
    }
    try {
      await simulateSwap(amountInWei, amountOutMinimum);
    } catch (e) {
      return { ok: false, error: `dry-run simulation failed: ${summarizeEvmError((e as Error).message)}` };
    }
    return {
      ok: true,
      skipped: true,
      reason: `dry-run: would swap ${formatEther(amountInWei)} WETH for >= ${amountOutMinimum} raw tokens`,
    };
  }

  let buyTx: Hash | undefined;
  try {
    await ensureRouterAllowance(amountInWei);
    const swap = await swapWethForToken(amountInWei, amountOutMinimum);
    buyTx = swap.hash;
    return { ok: true, skipped: false, buyTx: swap.hash, tokensBought: swap.tokensReceived };
  } catch (e) {
    return { ok: false, error: summarizeEvmError((e as Error).message), buyTx };
  }
}

/** Exposed for the preflight script. */
export async function treasuryReport() {
  const account = getTreasuryAccount();
  const [eth, weth, chainId] = await Promise.all([
    getTreasuryEthBalance(),
    getTreasuryWethBalance(),
    getPublicClient().getChainId(),
  ]);
  return { address: account.address, eth, weth, chainId };
}
