import { parseEther } from "viem";

import { CHAINLINK_FEED_ABI } from "./abis";
import { ETH_USD_FEED } from "./chain";
import { getPublicClient } from "./treasury";

/**
 * ETH/USD comes from the Chainlink feed deployed on Robinhood Chain. Chainlink
 * is the chain's official oracle provider, so this beats trusting an off-chain
 * HTTP price endpoint.
 *
 * The price only *sizes* the swap (how much WETH is $1?). Execution is protected
 * independently by `amountOutMinimum`, so a bad price can't get us a bad fill —
 * only a wrong-sized one. The guards below bound that damage.
 */

/** Reject a feed that hasn't updated recently — a frozen oracle is a wrong oracle. */
const MAX_PRICE_AGE_SEC = Number(process.env.MAX_PRICE_AGE_SEC ?? "7200");
/** Absolute sanity band. A feed outside this is broken, not merely volatile. */
const MIN_ETH_USD = Number(process.env.MIN_ETH_USD ?? "50");
const MAX_ETH_USD = Number(process.env.MAX_ETH_USD ?? "100000");

const CACHE_MS = 30_000;
let cache: { price: number; at: number } | null = null;

export async function getEthUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.price;

  const feed = ETH_USD_FEED();
  const client = getPublicClient();

  const [[, answer, , updatedAt], decimals] = await Promise.all([
    client.readContract({
      address: feed,
      abi: CHAINLINK_FEED_ABI,
      functionName: "latestRoundData",
    }),
    client.readContract({
      address: feed,
      abi: CHAINLINK_FEED_ABI,
      functionName: "decimals",
    }),
  ]);

  if (answer <= 0n) {
    throw new Error("ETH/USD feed returned a non-positive answer");
  }

  const ageSec = Math.floor(now / 1000) - Number(updatedAt);
  if (ageSec > MAX_PRICE_AGE_SEC) {
    throw new Error(
      `ETH/USD feed is stale: last update ${ageSec}s ago (max ${MAX_PRICE_AGE_SEC}s)`,
    );
  }

  const price = Number(answer) / 10 ** Number(decimals);
  if (!Number.isFinite(price) || price < MIN_ETH_USD || price > MAX_ETH_USD) {
    throw new Error(
      `ETH/USD price ${price} outside sanity band [${MIN_ETH_USD}, ${MAX_ETH_USD}]`,
    );
  }

  cache = { price, at: now };
  return price;
}

/** How many wei of (W)ETH is `usd` dollars worth right now? */
export async function usdToWei(usd: number): Promise<bigint> {
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`usdToWei: invalid usd amount ${usd}`);
  }
  const price = await getEthUsdPrice();
  const eth = usd / price;
  // 18 significant digits is plenty and avoids float noise in the low bits.
  return parseEther(eth.toFixed(18) as `${number}`);
}
