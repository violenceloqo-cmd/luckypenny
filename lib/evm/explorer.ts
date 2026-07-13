/**
 * Blockscout links. Kept free of `viem/chains` imports so client components can
 * pull it in without dragging the whole chain barrel into the browser bundle.
 */

const EXPLORERS = {
  mainnet: "https://robinhoodchain.blockscout.com",
  testnet: "https://explorer.testnet.chain.robinhood.com",
} as const;

export type RhNetwork = keyof typeof EXPLORERS;

export function normalizeNetwork(raw?: string | null): RhNetwork {
  return (raw ?? "mainnet").trim().toLowerCase() === "testnet" ? "testnet" : "mainnet";
}

/** Client-safe: reads the NEXT_PUBLIC_ mirror of RH_CHAIN. */
export function explorerBase(): string {
  return EXPLORERS[normalizeNetwork(process.env.NEXT_PUBLIC_RH_CHAIN)];
}

export function blockscoutTxUrl(hash: string): string {
  return `${explorerBase()}/tx/${hash}`;
}

export function blockscoutAddressUrl(address: string): string {
  return `${explorerBase()}/address/${address}`;
}
