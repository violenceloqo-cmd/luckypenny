import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { getServerTokenMint } from "@/lib/token";

import { normalizeCluster, type SolanaCluster } from "./cluster";

/** Rent-exempt minimum for a Token-2022 ATA (~0.00207 SOL), paid on the first buy. */
export const TOKEN_ATA_RENT_LAMPORTS = 2_100_000;
/** Headroom for base + priority fees across the buy tx and the burn tx. */
export const TX_FEE_BUFFER_LAMPORTS = 600_000;

let cachedConnection: Connection | null = null;
let cachedKeypair: Keypair | null = null;
let cachedMint: PublicKey | null = null;

export function getCluster(): SolanaCluster {
  return normalizeCluster(process.env.SOLANA_CLUSTER);
}

export function isMainnet(): boolean {
  return getCluster() === "mainnet-beta";
}

/** `DRY_RUN=1` simulates the pump.fun buy and never sends anything. */
export function isDryRun(): boolean {
  const v = process.env.DRY_RUN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getConnection(): Connection {
  if (cachedConnection) return cachedConnection;
  const url =
    process.env.SOLANA_RPC_URL?.trim() ||
    (isMainnet() ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
  cachedConnection = new Connection(url, { commitment: "confirmed" });
  return cachedConnection;
}

export function getTreasuryKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  const secret = process.env.TREASURY_SECRET_KEY?.trim();
  if (!secret) throw new Error("TREASURY_SECRET_KEY is not set");
  // Accept either base58 (Phantom export) or a JSON byte array (solana-keygen).
  const bytes = secret.startsWith("[")
    ? Uint8Array.from(JSON.parse(secret) as number[])
    : bs58.decode(secret);
  cachedKeypair = Keypair.fromSecretKey(bytes);
  return cachedKeypair;
}

export function getTokenMint(): PublicKey {
  if (cachedMint) return cachedMint;
  cachedMint = new PublicKey(getServerTokenMint());
  return cachedMint;
}

export function getMaxSolPerDrop(): number {
  const v = Number(process.env.MAX_SOL_PER_DROP ?? "1");
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function getPumpPriorityFeeSol(): number {
  const v = Number(process.env.PUMP_PRIORITY_FEE_SOL ?? "0.0005");
  return Number.isFinite(v) && v >= 0 ? v : 0.0005;
}

/** Total priority fee for each burn. Defaults to the buy's, so both land equally fast. */
export function getBurnPriorityFeeSol(): number {
  const v = Number(process.env.BURN_PRIORITY_FEE_SOL ?? getPumpPriorityFeeSol());
  return Number.isFinite(v) && v >= 0 ? v : getPumpPriorityFeeSol();
}

export function getPumpSlippagePct(): number {
  const v = Number(process.env.PUMP_SLIPPAGE_PCT ?? "10");
  return Number.isFinite(v) && v > 0 && v <= 50 ? v : 10;
}

/** Minimum lamports the treasury needs to attempt a pump.fun buy + SPL burn. */
export function estimateBuyAndBurnLamports(solAmount: number): number {
  const buyLamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
  const priorityLamports = Math.ceil((getPumpPriorityFeeSol() + getBurnPriorityFeeSol()) * LAMPORTS_PER_SOL);
  return buyLamports + priorityLamports + TOKEN_ATA_RENT_LAMPORTS + TX_FEE_BUFFER_LAMPORTS;
}

export async function getTreasurySolBalance(): Promise<number> {
  const lamports = await getConnection().getBalance(getTreasuryKeypair().publicKey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}
