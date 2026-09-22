/**
 * Burn every token the treasury holds. Recovery for a drop whose buy landed but
 * whose burn failed (its row says "Bought but burn failed").
 *
 *   npm run burn:sweep            # show what would be burned
 *   npm run burn:sweep -- --yes   # burn it
 *
 * Don't run with --yes while drops are in flight: a concurrent drop's freshly
 * bought tokens would be swept here and its own burn would then fail.
 */
import { burnTokens, readTokenBalance } from "../lib/solana/burn";
import { getConnection, getTokenMint, getTreasuryKeypair } from "../lib/solana/treasury";

const connection = getConnection();
const treasury = getTreasuryKeypair();
const mint = getTokenMint();

const held = await readTokenBalance(connection, treasury.publicKey, mint);
console.log("Treasury:", treasury.publicKey.toBase58());
console.log("Mint:    ", mint.toBase58());
console.log("Held:    ", held.toString(), "raw units");

if (held === 0n) {
  console.log("Nothing to burn.");
  process.exit(0);
}
if (!process.argv.includes("--yes")) {
  console.log("\nDry run. Re-run with `-- --yes` to burn these tokens.");
  process.exit(0);
}

const burn = await burnTokens(connection, treasury, mint, held);
console.log("Burned:  ", burn.amount.toString(), `https://solscan.io/tx/${burn.signature}`);
