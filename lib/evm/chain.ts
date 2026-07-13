import { getAddress, type Address } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";

import { normalizeNetwork, type RhNetwork } from "./explorer";

export const ROBINHOOD_CHAIN_ID = 4663;

export function getNetwork(): RhNetwork {
  return normalizeNetwork(process.env.RH_CHAIN);
}

export function isMainnet(): boolean {
  return getNetwork() === "mainnet";
}

export function getChain() {
  return isMainnet() ? robinhood : robinhoodTestnet;
}

export function getRpcUrl(): string {
  // The public endpoint is rate-limited and documented as not production-safe.
  return process.env.RH_RPC_URL?.trim() || getChain().rpcUrls.default.http[0];
}

/**
 * Every address below was confirmed against mainnet by checking that bytecode
 * exists AND that its getters return the expected values. Blockscout contract
 * *names* are not trustworthy here: the chain hosts at least four competing
 * Uniswap V3 forks plus several contracts named "SwapRouter" and "NOXA".
 * `verifyChain()` re-asserts the wiring at boot — see lib/evm/verify.ts.
 */
const DEFAULTS = {
  weth: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  swapRouter: "0xcaf681a66d020601342297493863e78c959e5cb2", // SwapRouter02
  v3Factory: "0x1f7d7550b1b028f7571e69a784071f0205fd2efa",
  quoter: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7", // QuoterV2
  ethUsdFeed: "0x78f3556b67e17df817d51ef5a990cdaf09e8d3a9", // Chainlink "ETH / USD"
} as const;

function addr(envVar: string, fallback: string): Address {
  return getAddress(process.env[envVar]?.trim() || fallback);
}

export const WETH_ADDRESS = () => addr("WETH_ADDRESS", DEFAULTS.weth);
export const SWAP_ROUTER = () => addr("NOXA_SWAP_ROUTER", DEFAULTS.swapRouter);
export const V3_FACTORY = () => addr("NOXA_V3_FACTORY", DEFAULTS.v3Factory);
export const QUOTER = () => addr("NOXA_QUOTER", DEFAULTS.quoter);
export const ETH_USD_FEED = () => addr("ETH_USD_FEED", DEFAULTS.ethUsdFeed);

/** Noxa launches at the 1% tier. Confirmed via `pool.fee()` on a live pool. */
export function getPoolFeeTier(): number {
  const v = Number(process.env.POOL_FEE_TIER ?? "10000");
  return Number.isFinite(v) && v > 0 ? v : 10000;
}

export function getDropCostUsd(): number {
  const v = Number(process.env.DROP_COST_USD ?? "1");
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/** Hard cap on a single drop's spend. Even a bad multiplier table can't exceed it. */
export function getMaxUsdPerDrop(): number {
  const v = Number(process.env.MAX_USD_PER_DROP ?? "25");
  return Number.isFinite(v) && v > 0 ? v : 25;
}

export function getSlippagePct(): number {
  const v = Number(process.env.SWAP_SLIPPAGE_PCT ?? "5");
  return Number.isFinite(v) && v > 0 && v < 50 ? v : 5;
}

/** Skip sending transactions; simulate them instead. */
export function isDryRun(): boolean {
  return process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
}

export { blockscoutTxUrl, blockscoutAddressUrl } from "./explorer";
