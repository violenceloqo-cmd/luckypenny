/**
 * One buy + burn outside the Plinko UI, exactly as a drop runs it.
 * Respects DRY_RUN — with DRY_RUN=1 the buy is only simulated.
 *
 *   npm run buy-burn -- [solAmount]    (default 0.01)
 */
import { buyAndBurn } from "../lib/solana/buyAndBurn";
import { getTreasurySolBalance, isDryRun } from "../lib/solana/treasury";

const solAmount = Number(process.argv[2] ?? "0.01");
if (!Number.isFinite(solAmount) || solAmount <= 0) {
  console.error("Usage: npm run buy-burn -- [solAmount]");
  process.exit(1);
}

console.log("Treasury balance:", (await getTreasurySolBalance()).toFixed(4), "SOL");
console.log(`${isDryRun() ? "Simulating" : "Sending"} buy + burn of ${solAmount} SOL…\n`);

const res = await buyAndBurn({
  solAmount,
  onBought: (sig) => console.log("Bought:", sig, "— burning…"),
});
console.log(JSON.stringify(res, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
process.exit(res.ok ? 0 : 1);
