/**
 * Cluster + Solscan helpers. Kept free of `@solana/web3.js` imports so client
 * components can pull it in without dragging the SDK into the browser bundle.
 */

export type SolanaCluster = "mainnet-beta" | "devnet";

/** Accept `mainnet`, `mainnet-beta`, etc. Defaults to mainnet-beta. */
export function normalizeCluster(raw?: string | null): SolanaCluster {
  const c = (raw ?? "mainnet-beta").trim().toLowerCase();
  if (c === "mainnet-beta" || c === "mainnet") return "mainnet-beta";
  return "devnet";
}

/** Client-safe: reads the NEXT_PUBLIC_ mirror of SOLANA_CLUSTER. */
function publicClusterSuffix(): string {
  return normalizeCluster(process.env.NEXT_PUBLIC_SOLANA_CLUSTER) === "devnet" ? "?cluster=devnet" : "";
}

export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}${publicClusterSuffix()}`;
}

export function solscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${mint}${publicClusterSuffix()}`;
}
