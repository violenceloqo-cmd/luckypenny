/** Default pump.fun token mint (override via PUMPFUN_TOKEN_MINT / NEXT_PUBLIC_PUMPFUN_TOKEN_MINT). */
export const DEFAULT_PUMPFUN_TOKEN_MINT = "A4tRFWMmv1Ujw7xLpcKYBBm1kLaK5QSFzwRxxSAhpump";

export function getPublicTokenMint(): string {
  return process.env.NEXT_PUBLIC_PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}

export function getServerTokenMint(): string {
  return process.env.PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}
