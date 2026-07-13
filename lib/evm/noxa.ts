import {
  encodeFunctionData,
  maxUint256,
  parseEventLogs,
  type Address,
  type Hash,
} from "viem";

import { ERC20_ABI, QUOTER_V2_ABI, SWAP_ROUTER_02_ABI } from "./abis";
import { getPoolFeeTier, getSlippagePct, QUOTER, SWAP_ROUTER, WETH_ADDRESS } from "./chain";
import {
  getPublicClient,
  getTokenAddress,
  getTreasuryAccount,
  getWalletClient,
} from "./treasury";

/** Seconds a swap stays valid once broadcast. */
const DEADLINE_SEC = 120n;

/**
 * Noxa tokens live in a Uniswap V3 pool (1% fee tier), paired against WETH —
 * there is no bonding curve. A buy is therefore a plain `exactInputSingle`.
 *
 * We route through SwapRouter02, whose `exactInputSingle` carries no deadline
 * field, so the call is wrapped in `multicall(deadline, [...])` to get one.
 */

/**
 * Ask the quoter what this swap would return. `quoteExactInputSingle` is not
 * `view` (it mutates then reverts internally), so it must be simulated rather
 * than read.
 */
export async function quoteWethToToken(amountInWei: bigint): Promise<bigint> {
  const { result } = await getPublicClient().simulateContract({
    address: QUOTER(),
    abi: QUOTER_V2_ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: WETH_ADDRESS(),
        tokenOut: getTokenAddress(),
        amountIn: amountInWei,
        fee: getPoolFeeTier(),
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return result[0];
}

/** `amountOutMinimum` must never be zero — that is an open invitation to sandwich us. */
export function applySlippage(quoted: bigint): bigint {
  const bps = BigInt(Math.round(getSlippagePct() * 100));
  const out = (quoted * (10_000n - bps)) / 10_000n;
  if (out <= 0n) throw new Error("computed amountOutMinimum is zero");
  return out;
}

export async function getRouterAllowance(): Promise<bigint> {
  return getPublicClient().readContract({
    address: WETH_ADDRESS(),
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [getTreasuryAccount().address, SWAP_ROUTER()],
  });
}

/**
 * Approve the router once, not per drop. Returns the approval hash if one was
 * sent, or null if the existing allowance already covers the trade.
 */
export async function ensureRouterAllowance(amountInWei: bigint): Promise<Hash | null> {
  if ((await getRouterAllowance()) >= amountInWei) return null;

  const wallet = getWalletClient();
  const account = getTreasuryAccount();
  const hash = await wallet.writeContract({
    address: WETH_ADDRESS(),
    abi: ERC20_ABI,
    functionName: "approve",
    args: [SWAP_ROUTER(), maxUint256],
    account,
    chain: wallet.chain,
  });
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`WETH approve reverted (${hash})`);
  return hash;
}

function buildSwapCalldata(amountInWei: bigint, amountOutMinimum: bigint, recipient: Address) {
  const inner = encodeFunctionData({
    abi: SWAP_ROUTER_02_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: WETH_ADDRESS(),
        tokenOut: getTokenAddress(),
        fee: getPoolFeeTier(),
        recipient,
        amountIn: amountInWei,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return inner;
}

export interface SwapResult {
  hash: Hash;
  tokensReceived: bigint;
}

/** Simulate the swap without sending. Used by DRY_RUN and the preflight script. */
export async function simulateSwap(amountInWei: bigint, amountOutMinimum: bigint): Promise<void> {
  const account = getTreasuryAccount();
  const deadline = BigInt(Math.floor(Date.now() / 1000)) + DEADLINE_SEC;
  await getPublicClient().simulateContract({
    address: SWAP_ROUTER(),
    abi: SWAP_ROUTER_02_ABI,
    functionName: "multicall",
    args: [deadline, [buildSwapCalldata(amountInWei, amountOutMinimum, account.address)]],
    account,
  });
}

export async function swapWethForToken(
  amountInWei: bigint,
  amountOutMinimum: bigint,
): Promise<SwapResult> {
  const client = getPublicClient();
  const wallet = getWalletClient();
  const account = getTreasuryAccount();
  const token = getTokenAddress();
  const deadline = BigInt(Math.floor(Date.now() / 1000)) + DEADLINE_SEC;
  const args = [
    deadline,
    [buildSwapCalldata(amountInWei, amountOutMinimum, account.address)],
  ] as const;

  // Simulate first so a revert surfaces as a clean error instead of a spent tx.
  await client.simulateContract({
    address: SWAP_ROUTER(),
    abi: SWAP_ROUTER_02_ABI,
    functionName: "multicall",
    args,
    account,
  });

  const hash = await wallet.writeContract({
    address: SWAP_ROUTER(),
    abi: SWAP_ROUTER_02_ABI,
    functionName: "multicall",
    args,
    account,
    chain: wallet.chain,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`swap reverted (${hash})`);

  // The receipt is authoritative once mined, so the balance needs no polling.
  const transfers = parseEventLogs({
    abi: ERC20_ABI,
    eventName: "Transfer",
    logs: receipt.logs,
  });
  const tokensReceived = transfers
    .filter(
      (log) =>
        log.address.toLowerCase() === token.toLowerCase() &&
        log.args.to.toLowerCase() === account.address.toLowerCase(),
    )
    .reduce((sum, log) => sum + log.args.value, 0n);

  if (tokensReceived <= 0n) {
    throw new Error(`swap succeeded but no ${token} Transfer to treasury found in ${hash}`);
  }

  return { hash, tokensReceived };
}
