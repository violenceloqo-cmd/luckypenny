import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

let cachedConnection: Connection | null = null;
let cachedKeypair: Keypair | null = null;
let cachedMint: PublicKey | null = null;

export function getCluster(): "mainnet-beta" | "devnet" {
  const c = (process.env.SOLANA_CLUSTER ?? "devnet").toLowerCase();
  return c === "mainnet-beta" || c === "mainnet" ? "mainnet-beta" : "devnet";
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
