import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import { normalizeCluster } from "./cluster";

/** Rent-exempt minimum for a Token-2022 ATA (~0.00207 SOL). */
export const TOKEN_ATA_RENT_LAMPORTS = 2_100_000;
/** Headroom for priority fees + base tx fees on buy and burn. */
export const TX_FEE_BUFFER_LAMPORTS = 600_000;

let cachedConnection: Connection | null = null;
let cachedKeypair: Keypair | null = null;
let cachedMint: PublicKey | null = null;

export function getCluster(): "mainnet-beta" | "devnet" {
  return normalizeCluster(process.env.SOLANA_CLUSTER);
}

export function isMainnet(): boolean {
  return getCluster() === "mainnet-beta";
}

export function getConnection(): Connection {
  if (cachedConnection) return cachedConnection;
  const url =
    process.env.SOLANA_RPC_URL ??
    (isMainnet() ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
  cachedConnection = new Connection(url, { commitment: "confirmed" });
  return cachedConnection;
}

export function getTreasuryKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  const secret = process.env.TREASURY_SECRET_KEY;
  if (!secret) {
    throw new Error("TREASURY_SECRET_KEY is not set");
  }
  // Support either base58 or JSON-array format.
  let bytes: Uint8Array;
  if (secret.trim().startsWith("[")) {
    const arr = JSON.parse(secret) as number[];
    bytes = Uint8Array.from(arr);
  } else {
    bytes = bs58.decode(secret.trim());
  }
  cachedKeypair = Keypair.fromSecretKey(bytes);
  return cachedKeypair;
}

export function getTokenMint(): PublicKey {
  if (cachedMint) return cachedMint;
  const m = process.env.PUMPFUN_TOKEN_MINT;
  if (!m) throw new Error("PUMPFUN_TOKEN_MINT is not set");
  cachedMint = new PublicKey(m);
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

/** Minimum lamports the treasury needs to attempt a pump.fun buy + SPL burn. */
export function estimateBuyAndBurnLamports(solAmount: number): number {
  const buyLamports = Math.ceil(solAmount * LAMPORTS_PER_SOL);
  const priorityLamports = Math.ceil(getPumpPriorityFeeSol() * LAMPORTS_PER_SOL);
  return buyLamports + priorityLamports + TOKEN_ATA_RENT_LAMPORTS + TX_FEE_BUFFER_LAMPORTS;
}

export async function getTreasurySolBalance(connection: Connection, treasury: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(treasury, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}
