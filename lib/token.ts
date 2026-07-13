/** The Noxa-launched ERC-20 that every drop buys. No default: it must be set. */

function read(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** Browser-side: used by the header copy-CA button. May be absent pre-launch. */
export function getPublicTokenAddress(): string {
  return read("NEXT_PUBLIC_HOOD_TOKEN_ADDRESS") ?? "";
}

/** Server-side: used to quote, swap and verify. Throws rather than guessing. */
export function getServerTokenAddress(): string {
  const addr = read("HOOD_TOKEN_ADDRESS");
  if (!addr) {
    throw new Error(
      "HOOD_TOKEN_ADDRESS is not set — the Noxa token to buy has no default and must be configured",
    );
  }
  return addr;
}

/** ERC-20s are 18 decimals unless told otherwise; used only for display. */
export function getPublicTokenDecimals(): number {
  const v = Number(process.env.NEXT_PUBLIC_HOOD_TOKEN_DECIMALS ?? "18");
  return Number.isFinite(v) && v >= 0 && v <= 36 ? v : 18;
}
