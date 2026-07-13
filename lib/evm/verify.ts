import { zeroAddress, type Address } from "viem";

import { ERC20_ABI, QUOTER_V2_ABI, SWAP_ROUTER_02_ABI, V3_FACTORY_ABI, V3_POOL_ABI } from "./abis";
import {
  getPoolFeeTier,
  QUOTER,
  ROBINHOOD_CHAIN_ID,
  SWAP_ROUTER,
  V3_FACTORY,
  WETH_ADDRESS,
} from "./chain";
import { getPublicClient, getTokenAddress } from "./treasury";

/**
 * Assert the on-chain wiring rather than trusting the addresses in `.env`.
 *
 * This matters more than usual here: Robinhood Chain hosts several Uniswap V3
 * forks and multiple verified contracts named "SwapRouter", "Quoter" and
 * "NOXA". A lookalike address that merely *has bytecode* would happily accept a
 * swap and take the funds. So we check that the router, quoter and pool all
 * agree on the same factory and the same WETH.
 */

export interface ChainCheck {
  chainId: number;
  weth: Address;
  router: Address;
  quoter: Address;
  factory: Address;
  token: Address;
  pool: Address;
  poolLiquidity: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
}

function eq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export async function verifyChain(): Promise<ChainCheck> {
  const client = getPublicClient();
  const weth = WETH_ADDRESS();
  const router = SWAP_ROUTER();
  const quoter = QUOTER();
  const factory = V3_FACTORY();
  const token = getTokenAddress();
  const fee = getPoolFeeTier();

  const chainId = await client.getChainId();
  if (chainId !== ROBINHOOD_CHAIN_ID) {
    throw new Error(`RPC reports chain ${chainId}, expected ${ROBINHOOD_CHAIN_ID}`);
  }

  const [routerFactory, routerWeth, quoterFactory] = await Promise.all([
    client.readContract({ address: router, abi: SWAP_ROUTER_02_ABI, functionName: "factory" }),
    client.readContract({ address: router, abi: SWAP_ROUTER_02_ABI, functionName: "WETH9" }),
    client.readContract({ address: quoter, abi: QUOTER_V2_ABI, functionName: "factory" }),
  ]);

  if (!eq(routerFactory, factory)) {
    throw new Error(`router.factory() = ${routerFactory}, expected ${factory} — wrong V3 fork?`);
  }
  if (!eq(routerWeth, weth)) {
    throw new Error(`router.WETH9() = ${routerWeth}, expected ${weth}`);
  }
  if (!eq(quoterFactory, factory)) {
    throw new Error(`quoter.factory() = ${quoterFactory}, expected ${factory}`);
  }

  const [tokenSymbol, tokenDecimals] = await Promise.all([
    client.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
    client.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
  ]);

  const pool = await client.readContract({
    address: factory,
    abi: V3_FACTORY_ABI,
    functionName: "getPool",
    args: [weth, token, fee],
  });
  if (pool === zeroAddress) {
    throw new Error(`no ${fee / 10_000}% WETH/${tokenSymbol} pool exists for ${token}`);
  }

  const [poolFactory, poolLiquidity] = await Promise.all([
    client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: "factory" }),
    client.readContract({ address: pool, abi: V3_POOL_ABI, functionName: "liquidity" }),
  ]);
  if (!eq(poolFactory, factory)) {
    throw new Error(`pool.factory() = ${poolFactory}, expected ${factory}`);
  }
  // A pool with no liquidity exists but reverts every swap.
  if (poolLiquidity <= 0n) {
    throw new Error(`pool ${pool} has zero liquidity — every swap would revert`);
  }

  return {
    chainId,
    weth,
    router,
    quoter,
    factory,
    token,
    pool,
    poolLiquidity,
    tokenSymbol,
    tokenDecimals: Number(tokenDecimals),
  };
}
