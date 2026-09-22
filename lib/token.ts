/** Default pump.fun token mint (override via PUMPFUN_TOKEN_MINT / NEXT_PUBLIC_PUMPFUN_TOKEN_MINT). */
export const DEFAULT_PUMPFUN_TOKEN_MINT = "A4tRFWMmv1Ujw7xLpcKYBBm1kLaK5QSFzwRxxSAhpump";

/**
 * Browser-side: used by the header copy-CA button and Solscan token link.
 *
 * Must be a literal `process.env.NEXT_PUBLIC_…` read — Next.js only inlines
 * those into the client bundle. A dynamic `process.env[name]` is empty in the
 * browser, which rendered the default mint there and a hydration mismatch.
 */
export function getPublicTokenMint(): string {
  return process.env.NEXT_PUBLIC_PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}

/** Server-side: the mint every drop buys and burns. */
export function getServerTokenMint(): string {
  return process.env.PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}

/** pump.fun mints are 6 decimals; used only for display. */
export function getPublicTokenDecimals(): number {
  const v = Number(process.env.NEXT_PUBLIC_PUMPFUN_TOKEN_DECIMALS ?? "6");
  return Number.isFinite(v) && v >= 0 && v <= 18 ? v : 6;
}
