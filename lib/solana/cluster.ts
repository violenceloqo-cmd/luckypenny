export type SolanaCluster = "mainnet-beta" | "devnet";

/** Accept `mainnet`, `mainnet-beta`, etc. Defaults to mainnet-beta. */
export function normalizeCluster(raw?: string | null): SolanaCluster {
  const c = (raw ?? "mainnet-beta").toLowerCase();
  if (c === "mainnet-beta" || c === "mainnet") return "mainnet-beta";
  return "devnet";
}

export function isMainnetCluster(raw?: string | null): boolean {
  return normalizeCluster(raw) === "mainnet-beta";
}

/** Solscan mainnet transaction URL for buy/burn proof links. */
export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}
