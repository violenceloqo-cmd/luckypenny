/** Default pump.fun token mint (override via PUMPFUN_TOKEN_MINT / NEXT_PUBLIC_PUMPFUN_TOKEN_MINT). */
export const DEFAULT_PUMPFUN_TOKEN_MINT = "Bv2C7vnYh1J7yzbAsb4rZuaNhLqWc9XfAtonVjCYpump";

export function getPublicTokenMint(): string {
  return process.env.NEXT_PUBLIC_PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}

export function getServerTokenMint(): string {
  return process.env.PUMPFUN_TOKEN_MINT?.trim() || DEFAULT_PUMPFUN_TOKEN_MINT;
}
