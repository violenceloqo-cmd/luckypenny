/**
 * Finish drops stuck at "burning" (status `bought`): record a burn that already
 * landed on-chain, or burn the tokens now. Safe to re-run.
 *
 *   npm run reconcile                 # rows stuck > 5 min
 *   npm run reconcile -- --age=60     # rows stuck > 60 s
 */
import { reconcileStuckDrops } from "../lib/solana/reconcile";

const ageArg = process.argv.find((a) => a.startsWith("--age="));
const olderThanMs = ageArg ? Number(ageArg.slice(6)) * 1000 : undefined;

const results = await reconcileStuckDrops(olderThanMs === undefined ? {} : { olderThanMs });
if (results.length === 0) console.log("No stuck drops.");
for (const r of results) console.log(r.outcome.padEnd(9), r.id, r.detail);
process.exitCode = results.some((r) => r.outcome === "failed") ? 1 : 0;
