import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

import { getChain, getRpcUrl, WETH_ADDRESS } from "./chain";
import { ERC20_ABI } from "./abis";
import { getServerTokenAddress } from "@/lib/token";

let cachedPublic: PublicClient | null = null;
let cachedWallet: WalletClient | null = null;
let cachedAccount: PrivateKeyAccount | null = null;

export function getPublicClient(): PublicClient {
  if (cachedPublic) return cachedPublic;
  cachedPublic = createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  }) as PublicClient;
  return cachedPublic;
}

export function getTreasuryAccount(): PrivateKeyAccount {
  if (cachedAccount) return cachedAccount;
  const raw = process.env.TREASURY_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("TREASURY_PRIVATE_KEY is not set");
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("TREASURY_PRIVATE_KEY must be a 32-byte hex private key");
  }
  cachedAccount = privateKeyToAccount(key);
  return cachedAccount;
}

export function getWalletClient(): WalletClient {
  if (cachedWallet) return cachedWallet;
  cachedWallet = createWalletClient({
    account: getTreasuryAccount(),
    chain: getChain(),
    transport: http(getRpcUrl()),
  });
  return cachedWallet;
}

export function getTokenAddress(): Address {
  return getAddress(getServerTokenAddress());
}

/** Native ETH — this pays gas. Distinct from the WETH used to buy. */
export async function getTreasuryEthBalance(): Promise<bigint> {
  return getPublicClient().getBalance({ address: getTreasuryAccount().address });
}

/** WETH — this is what gets swapped. Underfunding either balance fails a drop. */
export async function getTreasuryWethBalance(): Promise<bigint> {
  return getPublicClient().readContract({
    address: WETH_ADDRESS(),
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [getTreasuryAccount().address],
  });
}
